import { Chess, Move, Pgn } from "@jackstenglein/chess";
import {
    newOpeningBook,
    newEndgameBook,
    newEndgamePosition,
    Annotations,
    Book,
    Color,
    Nag,
    Node,
    Position,
    Priority,
} from "./book";

/**
 * Export a book as PGN
 */
export function exportBook(book: Book): string {
    if (book.type === "opening") {
        const chess = newChess(book.position);
        chess.pgn.header.tags.bookType = "opening";
        chess.pgn.header.tags.bookName = book.name;
        chess.pgn.header.tags.bookColor = book.color;
        chess.pgn.header.tags.bookInitialMoves = book.initialMoves.join(":");
        recordNode(chess, book.rootNode);
        return chess.pgn.render();
    } else if (book.type === "endgame") {
        const parts = [];
        for (const position of book.positions) {
            const chess = newChess(position.position);
            chess.pgn.header.tags.bookType = "endgame";
            chess.pgn.header.tags.bookName = book.name;
            chess.pgn.header.tags.positionColor = position.color;
            recordNode(chess, position.rootNode);
            parts.push(chess.pgn.render());
        }
        return parts.join("\n\n");
    }
}

function newChess(position: Position): Chess {
    const chess = new Chess(position);
    chess.pgn.header.tags.Event = "?";
    chess.pgn.header.tags.Site = "?";
    chess.pgn.header.tags.Date = "????.??.??";
    chess.pgn.header.tags.Round = "?";
    chess.pgn.header.tags.White = "?";
    chess.pgn.header.tags.Black = "?";
    chess.pgn.header.tags.Result = "*";
    return chess;
}

function recordNode(chess: Chess, node: Node) {
    const comments = [];
    if (node.comment) {
        comments.push(node.comment);
    }
    if (node.annotations.arrows.length > 0) {
        comments.push(`[%cal ${node.annotations.arrows.join(",")}]`);
    }
    if (node.annotations.squares.length > 0) {
        comments.push(`[%csl ${node.annotations.squares.join(",")}]`);
    }
    if (comments.length > 0) {
        chess.setComment(comments.join(" "));
    }
    if (node.nags.length > 0) {
        chess.setNags(node.nags.map((n) => `$${n}`));
    }
    const currentMove = chess.currentMove();
    for (const [move, child] of Object.entries(node.children)) {
        chess.move(move);
        recordNode(chess, child);
        chess.seek(currentMove);
    }
}

/**
 * Import PGN as a book
 */
export function importBook(pgnSource: string): Book {
    const pgnList = splitPgn(pgnSource).map((source) => new Pgn(source));
    const firstPgn = pgnList[0];
    if (firstPgn === undefined) {
        throw Error(`Empty pgn file`);
    }
    const name = firstPgn.header.tags.bookName ?? "Unknown Book";

    if (firstPgn.header.tags.bookType === "opening") {
        const initialMoves =
            firstPgn.header.tags.bookInitialMoves?.split(":") ?? [];
        const book = newOpeningBook(
            name,
            colorFromPgnTag(firstPgn.header.tags.bookColor),
            initialMoves,
        );
        book.rootNode = importNode(firstPgn.history.moves[0]);
        return book;
    } else if (firstPgn.header.tags.bookType === "endgame") {
        const book = newEndgameBook(name);
        for (const pgn of pgnList) {
            const fen = pgn.header.tags.FEN;
            if (fen === undefined) {
                throw Error(`Endgame position without FEN`);
            }
            const position = newEndgamePosition(
                fen,
                colorFromPgnTag(pgn.header.tags.positionColor),
            );
            position.rootNode = importNode(pgn.history.moves[0]);
            book.positions.push(position);
        }
        return book;
    } else {
        throw Error(
            `invalid book type: ${firstPgn.header.tags.bookType ?? "<none>"}`,
        );
    }
}

function colorFromPgnTag(value: string): Color {
    if (value == "w" || value == "b") {
        return value;
    } else {
        return "w";
    }
}

/// Split PGN that may contain multiple games into separate strings
function splitPgn(pgnText: string): string[] {
    const result = [];
    let currentLines = [];
    let inHeader = true;

    for (const line of pgnText.split("\n")) {
        // Technically, header tags can start anywhere, but in practice they always appear on their
        // own line.
        const header = line.trimStart().startsWith("[");
        if (inHeader && !header) {
            inHeader = false;
            currentLines.push(line);
        } else if (!inHeader && header) {
            result.push(currentLines.join("\n"));
            currentLines = [line];
            inHeader = true;
        } else {
            currentLines.push(line);
        }
    }
    result.push(currentLines.join("\n"));
    return result;
}

function importNode(move: Move | undefined | null, prevMove?: Move): Node {
    const children = {};
    let nags = [];
    let comment = "";
    const annotations: Annotations = {
        squares: [],
        arrows: [],
    };

    if (move) {
        children[move.san] = importNode(move.next, move);
        for (const variation of move.variations) {
            children[variation[0].san] = importNode(
                variation.at(1),
                variation[0],
            );
        }
    }

    if (prevMove) {
        nags = importNags(prevMove);
        comment = prevMove.commentAfter ?? "";
        if (prevMove.commentDiag) {
            annotations.squares = prevMove.commentDiag.colorFields ?? [];
            annotations.arrows = prevMove.commentDiag.colorArrows ?? [];
        }
    }
    return {
        children,
        comment,
        annotations,
        nags,
        priority: Priority.Default,
    };
}

function importNags(move: Move): Nag[] {
    if (move.nags === null) {
        return [];
    }

    const nags = [];
    for (const nag of move.nags) {
        if (!nag.startsWith("$")) {
            return [];
        }
        const parsed = parseInt(nag.slice(1));
        if (!isNaN(parsed)) {
            nags.push(parsed);
        } else {
            return [];
        }
    }
    return nags;
}
