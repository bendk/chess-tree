import { BookSummary, Move, MoveNode, Node } from "./book";
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
 * @field startedBooks uuids of the books the user has started and maybe completed
 * @field currentBook book the user is currently working through
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
 * @field bookId uuid of the book
 * @field currentPosition position the user is currently working on
 * @field positionsToGo positions left to train
 * @field currentLine line the user is currently working through
 */
export interface CurrentBook {
    bookId: string;
    currentPosition: TrainingPosition;
    positionsToGo: TrainingPosition[];
    currentLine: CurrentLine;
}
/**
 * A position the user is currently working through
 *
 * @field position initial position of the book (fen)
 * @field color which color is the user training?
 * @field initialMoves moves to get to this position (only populated for opening books)
 * @field initialPly ply of the first move for initialMoves
 * @field rootNode lines to train.  For in-progress books this will be store the remaining lines for the user.
 */
export interface TrainingPosition {
    position: string;
    color: "w" | "b";
    initialMoves: string[];
    initialPly: number;
    rootNode: Node;
}
/**
 * Line of the current book the user is working on
 *
 * @field moves moves played so far
 * @field wrongMove last wrong move chosen by the user.
 *      Will be "<skipped>" if the user moves forward instead of choosing the correct move.
 *      This is cleared each time the user gets another choice.
 * @field history tracks how the user progressed through the line
 * @field currentHistoryEntry CurrentLineHistoryEntry that we're building for the current move
 */
export interface CurrentLine {
    moves: MoveNode[];
    wrongMove: Move | null;
    history: CurrentLineHistoryEntry[];
    currentHistoryEntry: CurrentLineHistoryEntry;
}
/**
 * Entry in the history array
 *
 * @field move correct move
 * @field score did the user get them move correct?
 * @field otherMoves other moves the user tried
 */
export interface CurrentLineHistoryEntry {
    score: "correct" | "incorrect" | null;
    otherMoves: Move[];
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
