import { v4 as uuidv4 } from "uuid";
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
 * @field history tracks how the user progressed through the line
 * @field position position the user is currently working on
 */
export interface CurrentLine {
  moves: MoveNode[];
  index: number;
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
export type TrainingSelection =
  | TrainingSelectionAll
  | TrainingSelectionOpening
  | TrainingSelectionEndgame
  | TrainingSelectionManual;

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

export function booksForTraining(
  books: BookSummary[],
  selection: TrainingSelection,
): BookSummary[] {
  return books.filter((book) => bookMatchesSelection(book, selection));
}

function bookMatchesSelection(
  book: BookSummary,
  selection: TrainingSelection,
): boolean {
  if (selection.type == "all") {
    return true;
  } else if (selection.type == "opening") {
    if (book.type != "opening") {
      return false;
    }
    if (selection.color && selection.color != book.color) {
      return false;
    }

    if (
      selection.initialMoves &&
      (book.initialMoves === undefined ||
        book.initialMoves.slice(0, selection.initialMoves.length) !=
          selection.initialMoves)
    ) {
      return false;
    }
    return true;
  } else if (selection.type == "endgame") {
    return book.type == "endgame";
  } else if (selection.type == "manual") {
    return selection.books.indexOf(book.id) != -1;
  }
}

export interface TrainingActivity {
  timestamp: number;
  name: string;
  correctCount: number;
  incorrectCount: number;
}

export function newTraining(
  books: BookSummary[],
  selection: TrainingSelection,
  shuffle: boolean = true,
): Training {
  books = booksForTraining(books, selection);
  return {
    id: uuidv4(),
    timestamp: Math.floor(Date.now() / 1000),
    name: calcName(selection, books),
    position:
      books[0]?.position ??
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    selection,
    currentBook: null,
    startedBooks: [],
    correctCount: 0,
    incorrectCount: 0,
    linesTrained: 0,
    totalLines: books.reduce(
      (currentValue, book) => (book.lineCount ?? 0) + currentValue,
      0,
    ),
    shuffle,
  };
}

export function restartTraining(training: Training): Training {
  return {
    ...training,
    timestamp: Math.floor(Date.now() / 1000),
    currentBook: null,
    startedBooks: [],
    correctCount: 0,
    incorrectCount: 0,
    linesTrained: 0,
  };
}

function calcName(selection: TrainingSelection, books: BookSummary[]): string {
  if (selection.type == "all") {
    return "All books";
  } else if (selection.type === "endgame") {
    return "All endgames";
  } else if (selection.type == "opening") {
    let baseName = "All openings";
    if (selection.color == "w") {
      baseName = "White openings";
    } else if (selection.color == "b") {
      baseName = "Black openings";
    }

    if (selection.initialMoves && selection.initialMoves.length > 0) {
      const movesDisplay = selection.initialMoves
        .map((move, index) => {
          if (index % 2 == 0) {
            return `${1 + index / 2}.${move}`;
          } else {
            return move;
          }
        })
        .join(" ");
      return `${baseName}: ${movesDisplay}`;
    } else {
      return baseName;
    }
  } else if (selection.type == "manual") {
    const bookNames = new Map(books.map((b) => [b.id, b.name]));
    const firstBookId = selection.books[0];
    if (firstBookId === undefined) {
      return `Books: <none>`;
    }
    const firstBookName = bookNames.get(firstBookId) ?? "<unknown>";
    if (selection.books.length == 1) {
      return `Book: ${firstBookName}`;
    } else if (selection.books.length == 2) {
      const secondBookName = bookNames.get(selection.books[1]) ?? "<unknown>";
      return `Books: ${firstBookName} and ${secondBookName}`;
    } else {
      return `Books: ${firstBookName} and ${selection.books.length - 1} others`;
    }
  }
}
