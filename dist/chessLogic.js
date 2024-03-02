"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.positionColor = exports.moveToSquare = exports.makeMove = void 0;
const chess_1 = require("@jackstenglein/chess");
// Chess singleton that we use for this module's functionality.
//
// It's shared between all functions, which means potentially need to load the FEN frequently.
// But in practice, we don't need to do it that often, since we'll be making sequential moves to the chess instance.
const CHESS = new chess_1.Chess();
function tryMakeChessMove(position, move) {
    if (CHESS.fen() != position) {
        CHESS.load(position);
    }
    const moveResult = CHESS.move(move);
    if (moveResult === null) {
        return null;
    }
    else {
        return moveResult;
    }
}
/**
 * Try to make a move and get the resulting position
 */
function makeMove(position, move) {
    var _a, _b;
    return (_b = (_a = tryMakeChessMove(position, move)) === null || _a === void 0 ? void 0 : _a.fen) !== null && _b !== void 0 ? _b : null;
}
exports.makeMove = makeMove;
/**
 * Get the to square for a move
 */
function moveToSquare(position, move) {
    var _a, _b;
    return (_b = (_a = tryMakeChessMove(position, move)) === null || _a === void 0 ? void 0 : _a.to) !== null && _b !== void 0 ? _b : null;
}
exports.moveToSquare = moveToSquare;
/**
 * Get the color to move for a position
 */
function positionColor(position) {
    const turn = position.split(" ")[1];
    if (turn == "w" || turn == "b") {
        return turn;
    }
    else {
        throw Error(`Invalid position: ${position}`);
    }
}
exports.positionColor = positionColor;
