import { Chess, Move as ChessMove } from "@jackstenglein/chess";
import { Color, Move, Position } from "./book";

// Chess singleton that we use for this module's functionality.
//
// It's shared between all functions, which means potentially need to load the FEN frequently.
// But in practice, we don't need to do it that often, since we'll be making sequential moves to the chess instance.
const CHESS = new Chess();

function tryMakeChessMove(position: Position, move: Move): ChessMove | null {
  if (CHESS.fen() != position) {
    CHESS.load(position);
  }
  const moveResult = CHESS.move(move);
  if (moveResult === null) {
    return null;
  } else {
    return moveResult;
  }
}

/**
 * Try to make a move and get the resulting position
 */
export function makeMove(position: Position, move: Move): Position | null {
  return tryMakeChessMove(position, move)?.fen ?? null;
}

/**
 * Get the to square for a move
 */
export function moveToSquare(position: Position, move: Move): string | null {
  return tryMakeChessMove(position, move)?.to ?? null;
}

/**
 * Get the color to move for a position
 */
export function positionColor(position: Position): Color {
  const turn = position.split(" ")[1];
  if (turn == "w" || turn == "b") {
    return turn;
  } else {
    throw Error(`Invalid position: ${position}`);
  }
}
