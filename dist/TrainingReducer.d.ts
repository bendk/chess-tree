import { Annotations, Book, BookSummary, Move } from "./book";
import { CurrentLineHistoryEntry, Training, TrainingActivity } from "./training";
export interface State {
    training: Training;
    booksToGo: string[];
    nextStep: Step;
    board: TrainingBoard;
    activity: TrainingActivity;
}
export type Step = BookNeeded | MoveBoardForwardAfterDelay | ChooseMove | ShowCorrectMove | ShowLineSummary | ShowTrainingSummary;
/**
 * A fully loaded book is needed.
 *
 * Load a book from the API and send the LoadBook action
 */
export interface BookNeeded {
    type: "book-needed";
    bookId: string;
}
/**
 * Wait a short delay, then send the MoveBoardForward action.
 *
 * This allows us to animate moves on the board.
 */
export interface MoveBoardForwardAfterDelay {
    type: "move-board-forward-after-delay";
}
/**
 * Let the user try to choose the correct move then send the TryMove action.
 *
 * `wrongMove` is non-null if the user has already chosen an incorrect move for this position.
 */
export interface ChooseMove {
    type: "choose-move";
    wrongMove: Move | null;
}
/**
 * Show the user the correct move
 *
 * This happens after the user chooses the wrong move, then advances forward.  Once the user is
 * ready, send the MoveBoardForward action.
 */
export interface ShowCorrectMove {
    type: "show-correct-move";
    move: Move;
}
/**
 * Show a summary of the entire line.
 *
 * Once the user is ready to move on, send the MoveToNextLine action
 */
export interface ShowLineSummary {
    type: "show-line-summary";
    moves: Move[];
    history: CurrentLineHistoryEntry[];
}
/**
 * Show a summary of the entire training
 *
 * This is the final step for a training.  After this, either delete the training or reset it by
 * calling `newTraining` and saving that data.
 */
export interface ShowTrainingSummary {
    type: "show-training-summary";
    correctCount: number;
    incorrectCount: number;
}
/**
 * Represents the board that's displayed
 */
export interface TrainingBoard {
    position: string;
    color: "w" | "b";
    initialPly: number;
    currentLineIndex: number;
    feedback: TrainingBoardFeedback | null;
    comment: string;
    annotations: Annotations;
}
export interface TrainingBoardFeedback {
    type: "correct" | "incorrect";
    file: number;
    rank: number;
}
export type Action = LoadBook | MoveBoardForward | TryMove | FinishCurrentLine;
/**
 * Load a new book to start training
 */
interface LoadBook {
    type: "load-book";
    book: Book;
}
/**
 * Move the training board forward one move
 *
 * This can also optionally adjust the score for the training.  This is used when the user
 * choose a move that didn't match the training, but they want to adjust the score.
 */
interface MoveBoardForward {
    type: "move-board-forward";
    fromCurrentLineIndex: number;
    adjustment?: ScoreAdjustment;
}
/**
 * Make the move that the user chose, if correct
 */
interface TryMove {
    type: "try-move";
    move: Move;
}
/**
 * Finish training the current line and move to the next one
 */
interface FinishCurrentLine {
    type: "finish-current-line";
}
export type ScoreAdjustment = "count-as-correct" | "ignore";
export declare function initialState(training: Training, books: BookSummary[]): State;
export declare function reduce(state: State, action: Action): State;
export {};
