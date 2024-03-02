import { Color, Move, Position } from "./book";
/**
 * Try to make a move and get the resulting position
 */
export declare function makeMove(position: Position, move: Move): Position | null;
/**
 * Get the to square for a move
 */
export declare function moveToSquare(position: Position, move: Move): string | null;
/**
 * Get the color to move for a position
 */
export declare function positionColor(position: Position): Color;
