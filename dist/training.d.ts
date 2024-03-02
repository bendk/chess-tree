import { BookSummary, Move, MoveNode } from "./book";
/**
 * Training that's currently in-progress
 *
 * @field id uuid of the training item
 * @field timestamp timestamp when the user started training (used for ordering)
 * @field selection which books are included in this training?
 * @field position position to display for the training (fen)
 * @field correctCount number of moves the user has correctly chosen
 * @field incorrectCount number of moves the user has incorrectly chosen
 * @field linesTrained how many lines has the user trained so far?
 * @field totalLines how many total lines are in the training?
 * @field currentBook book the user is currently working through
 * @field startedBooks uuids of the books the user has started and maybe completed
 * @field shuffle should we shuffle the books/lines?
 */
export interface Training {
    id: string;
    timestamp: number;
    name: string;
    selection: TrainingSelection;
    position: string;
    correctCount: number;
    incorrectCount: number;
    linesTrained: number;
    totalLines: number;
    startedBooks: string[];
    currentBook: CurrentBook | null;
    shuffle: boolean;
}
/**
 * Training summary data
 *
 * This is good for displaying a large number of training items in a list.  It excludes the
 * `currentBook` field, which can be large and is usually not needed.
 */
export type TrainingSummary = Exclude<Training, "currentBook">;
/**
 * The book the user's currently working through for a training
 *
 * This represents a snapshot of the book from when the user first started training it.
 *
 * @field bookId uuid of the book
 * @field position initial position of the book (fen)
 * @field currentLine line the user is currently working through
 */
export interface CurrentBook {
    bookId: string;
    currentPosition: TrainingPosition;
    currentLine: CurrentLine;
    positionsToGo: TrainingPosition[];
}
/**
 * A position the user is currently working through
 *
 * @field position initial position of the book (fen)
 * @field color which color is the user training?
 * @field initialMoves moves to get to this position (only populated for opening books)
 * @field initialPly ply of the first move for initialMoves
 * @field linesToGo remaining lines to train
 */
export interface TrainingPosition {
    position: string;
    color: "w" | "b";
    initialMoves: string[];
    initialPly: number;
    linesToGo: MoveNode[][];
}
/**
 * Line of the current book the user is working on
 *
 * @field moves all moves/nodes for the line
 * @field index index of the current move
 * @field position fen for the position
 * @field wrongMove last wrong move chosen by the user.
 *      Will be "<skipped>" if the user moves forward instead of choosing the correct move.
 *      This is cleared each time the user gets another choice.
 * @field correctCount number of moves the user has correctly chosen for this line
 * @field incorrectCount number of moves the user has incorrectly chosen for this line
 * @field position position the user is currently working on
 */
export interface CurrentLine {
    moves: MoveNode[];
    index: number;
    wrongMove: Move | null;
    correctCount: number;
    incorrectCount: number;
}
/**
 * Determines which books should be included in a training
 */
export type TrainingSelection = TrainingSelectionAll | TrainingSelectionOpening | TrainingSelectionEndgame | TrainingSelectionManual;
export interface TrainingSelectionAll {
    type: "all";
}
export interface TrainingSelectionOpening {
    type: "opening";
    color?: "w" | "b";
    initialMoves?: string[];
}
export interface TrainingSelectionEndgame {
    type: "endgame";
}
export interface TrainingSelectionManual {
    type: "manual";
    books: string[];
}
export declare function booksForTraining(books: BookSummary[], selection: TrainingSelection): BookSummary[];
export interface TrainingActivity {
    timestamp: number;
    name: string;
    correctCount: number;
    incorrectCount: number;
}
export declare function newTraining(books: BookSummary[], selection: TrainingSelection, shuffle?: boolean): Training;
export declare function restartTraining(training: Training): Training;
