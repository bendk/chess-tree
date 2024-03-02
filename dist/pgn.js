"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importBook = exports.exportBook = void 0;
const chess_1 = require("@jackstenglein/chess");
const book_1 = require("./book");
/**
 * Export a book as PGN
 */
function exportBook(book) {
    if (book.type === "opening") {
        const chess = newChess(book.position);
        chess.pgn.header.tags.bookType = "opening";
        chess.pgn.header.tags.bookName = book.name;
        chess.pgn.header.tags.bookColor = book.color;
        chess.pgn.header.tags.bookInitialMoves = book.initialMoves.join(":");
        recordNode(chess, book.rootNode);
        return chess.pgn.render();
    }
    else if (book.type === "endgame") {
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
exports.exportBook = exportBook;
function newChess(position) {
    const chess = new chess_1.Chess(position);
    chess.pgn.header.tags.Event = "?";
    chess.pgn.header.tags.Site = "?";
    chess.pgn.header.tags.Date = "????.??.??";
    chess.pgn.header.tags.Round = "?";
    chess.pgn.header.tags.White = "?";
    chess.pgn.header.tags.Black = "?";
    chess.pgn.header.tags.Result = "*";
    return chess;
}
function recordNode(chess, node) {
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
function importBook(pgnSource) {
    var _a, _b, _c, _d;
    const pgnList = splitPgn(pgnSource).map((source) => new chess_1.Pgn(source));
    const firstPgn = pgnList[0];
    if (firstPgn === undefined) {
        throw Error(`Empty pgn file`);
    }
    const name = (_a = firstPgn.header.tags.bookName) !== null && _a !== void 0 ? _a : "Unknown Book";
    if (firstPgn.header.tags.bookType === "opening") {
        const initialMoves = (_c = (_b = firstPgn.header.tags.bookInitialMoves) === null || _b === void 0 ? void 0 : _b.split(":")) !== null && _c !== void 0 ? _c : [];
        const book = (0, book_1.newOpeningBook)(name, colorFromPgnTag(firstPgn.header.tags.bookColor), initialMoves);
        book.rootNode = importNode(firstPgn.history.moves[0]);
        return book;
    }
    else if (firstPgn.header.tags.bookType === "endgame") {
        const book = (0, book_1.newEndgameBook)(name);
        for (const pgn of pgnList) {
            const fen = pgn.header.tags.FEN;
            if (fen === undefined) {
                throw Error(`Endgame position without FEN`);
            }
            const position = (0, book_1.newEndgamePosition)(fen, colorFromPgnTag(pgn.header.tags.positionColor));
            position.rootNode = importNode(pgn.history.moves[0]);
            book.positions.push(position);
        }
        return book;
    }
    else {
        throw Error(`invalid book type: ${(_d = firstPgn.header.tags.bookType) !== null && _d !== void 0 ? _d : "<none>"}`);
    }
}
exports.importBook = importBook;
function colorFromPgnTag(value) {
    if (value == "w" || value == "b") {
        return value;
    }
    else {
        return "w";
    }
}
/// Split PGN that may contain multiple games into separate strings
function splitPgn(pgnText) {
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
        }
        else if (!inHeader && header) {
            result.push(currentLines.join("\n"));
            currentLines = [line];
            inHeader = true;
        }
        else {
            currentLines.push(line);
        }
    }
    result.push(currentLines.join("\n"));
    return result;
}
function importNode(move, prevMove) {
    var _a, _b, _c;
    const children = {};
    let nags = [];
    let comment = "";
    const annotations = {
        squares: [],
        arrows: [],
    };
    if (move) {
        children[move.san] = importNode(move.next, move);
        for (const variation of move.variations) {
            children[variation[0].san] = importNode(variation.at(1), variation[0]);
        }
    }
    if (prevMove) {
        nags = importNags(prevMove);
        comment = (_a = prevMove.commentAfter) !== null && _a !== void 0 ? _a : "";
        if (prevMove.commentDiag) {
            annotations.squares = (_b = prevMove.commentDiag.colorFields) !== null && _b !== void 0 ? _b : [];
            annotations.arrows = (_c = prevMove.commentDiag.colorArrows) !== null && _c !== void 0 ? _c : [];
        }
    }
    return {
        children,
        comment,
        annotations,
        nags,
    };
}
function importNags(move) {
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
        }
        else {
            return [];
        }
    }
    return nags;
}
