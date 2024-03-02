/*
 * Redux-style reducer for a training session
 */

import {
  Annotations,
  Book,
  BookSummary,
  Move,
  MoveNode,
  Node,
  childCount,
} from "./book";
import {
  CurrentBook,
  CurrentLine,
  CurrentLineHistoryEntry,
  Training,
  TrainingActivity,
  TrainingPosition,
  booksForTraining,
} from "./training";
import { makeMove, moveToSquare, positionColor } from "./chessLogic";

export interface State {
  training: Training;
  booksToGo: string[];
  nextStep: Step;
  board: TrainingBoard;
  activity: TrainingActivity;
}

export type Step =
  | BookNeeded
  | MoveBoardForwardAfterDelay
  | ChooseMove
  | ShowCorrectMove
  | ShowLineSummary
  | ShowTrainingSummary;

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

export function initialState(training: Training, books: BookSummary[]): State {
  let board: TrainingBoard;
  if (training.currentBook) {
    board = newTrainingBoard(training.currentBook.currentPosition);
  } else {
    board = {
      position: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
      color: "w",
      initialPly: 0,
      currentLineIndex: 0,
      feedback: null,
      annotations: {
        arrows: [],
        squares: [],
      },
      comment: "",
    };
  }
  const booksToGo = shuffleArray(
    training,
    booksForTraining(books, training.selection)
      .filter((book) => training.startedBooks.indexOf(book.id) == -1)
      .map((book) => book.id),
  );
  return {
    training,
    booksToGo,
    board,
    nextStep: calcNextStep(training, booksToGo, board),
    activity: {
      timestamp: Date.now(),
      name: training.name,
      correctCount: 0,
      incorrectCount: 0,
    },
  };
}

function calcNextStep(
  training: Training,
  booksToGo: string[],
  board: TrainingBoard,
): Step {
  const currentBook = training.currentBook;

  if (currentBook === null) {
    if (booksToGo.length > 0) {
      return {
        type: "book-needed",
        bookId: booksToGo[0],
      };
    } else {
      return {
        type: "show-training-summary",
        correctCount: training.correctCount,
        incorrectCount: training.incorrectCount,
      };
    }
  } else {
    const currentPosition = currentBook.currentPosition;
    const currentLine = currentBook.currentLine;
    if (
      board.currentLineIndex >= currentLine.moves.length &&
      (currentLine.wrongMove === null || currentLine.wrongMove === "<skipped>")
    ) {
      return {
        type: "show-line-summary",
        moves: currentLine.moves.map((n) => n.move),
        history: currentLine.history,
      };
    }

    if (board.currentLineIndex < currentLine.index) {
      return { type: "move-board-forward-after-delay" };
    } else if (board.color != currentPosition.color) {
      if (currentLine.wrongMove === null) {
        return { type: "move-board-forward-after-delay" };
      } else {
        return {
          type: "show-correct-move",
          move: currentLine.moves[currentLine.index - 1].move,
        };
      }
    } else {
      return { type: "choose-move", wrongMove: currentLine.wrongMove };
    }
  }
}

export function reduce(state: State, action: Action): State {
  if (action.type == "load-book") {
    state = handleLoadBook(state, action);
  } else if (action.type == "move-board-forward") {
    state = handleMoveBoardForward(state, action);
  } else if (action.type == "try-move") {
    state = handleTryMove(state, action);
  } else if (action.type == "finish-current-line") {
    state = handleFinishCurrentLine(state, action);
  } else {
    throw Error(`TraningSession.reduce: Unknown action type: ${action}`);
  }
  return {
    ...state,
    nextStep: calcNextStep(state.training, state.booksToGo, state.board),
  };
}

function handleLoadBook(state: State, action: LoadBook): State {
  const { book } = action;
  state = {
    ...state,
    booksToGo: state.booksToGo.filter((b) => b != book.id),
    training: {
      ...state.training,
      startedBooks: [...state.training.startedBooks, book.id],
    },
  };
  const currentBook = newCurrentBook(state.training, book);

  if (currentBook !== null) {
    state = {
      ...state,
      training: {
        ...state.training,
        currentBook,
      },
      board: newTrainingBoard(currentBook.currentPosition),
    };
  }
  return state;
}

function handleMoveBoardForward(state: State, action: MoveBoardForward): State {
  const { adjustment, fromCurrentLineIndex } = action;

  if (fromCurrentLineIndex != state.board.currentLineIndex) {
    // This action was for a previous board state, ignore it.
    return state;
  }

  // Clear the feedback, since the user did not make any move
  state = unsetBoardFeedback(state);

  const currentBook = state.training.currentBook;
  if (
    currentBook !== null &&
    state.board.currentLineIndex >= currentBook.currentLine.index
  ) {
    // User is moving forward to the next move
    if (state.board.color != currentBook.currentPosition.color) {
      // Moving past the opponent's move, clear wrongMove
      state = changeCurrentLine(state, (currentLine) => ({
        ...currentLine,
        wrongMove: null,
      }));
    } else if (currentBook.currentLine.wrongMove === null) {
      // Skipping their move, set wrong move to "<skipped>"
      state = updateCurrentHistoryEntry(state, "incorrect", "<skipped>");
    }
  }
  if (adjustment == "count-as-correct") {
    state = updateLastHistoryEntry(state, "correct");
  } else if (adjustment == "ignore") {
    state = updateLastHistoryEntry(state, null);
  }
  state = advanceBoard(state);
  return state;
}

function handleTryMove(state: State, action: TryMove): State {
  const { move } = action;

  const training = state.training;
  if (training.currentBook === null) {
    throw Error("TrainingReducer.handleTryMove(): no current book");
  }
  const currentLine = training.currentBook.currentLine;
  if (currentLine.moves[currentLine.index].move == move) {
    // User chose the move correctly
    if (currentLine.wrongMove === null) {
      // If it was the first guess, give them points
      state = updateCurrentHistoryEntry(state, "correct", null);
      state = setBoardFeedback(state, "correct", move);
    } else {
      // If they guessed incorrectly before, remove the error feedback
      state = unsetBoardFeedback(state);
    }
    state = advanceBoard(state);
  } else {
    // User chose incorrectly
    state = updateCurrentHistoryEntry(state, "incorrect", move);
    state = setBoardFeedback(state, "incorrect", move);
  }
  return state;
}

function handleFinishCurrentLine(
  state: State,
  _action: FinishCurrentLine,
): State {
  let training = state.training;
  let board = state.board;
  const currentBook = training.currentBook;
  if (currentBook === null) {
    throw Error("TrainingReducer.handleFinishCurrentLine(): no current book");
  }

  while (
    currentBook.currentPosition.linesToGo.length == 0 &&
    currentBook.positionsToGo.length > 0
  ) {
    [currentBook.currentPosition, ...currentBook.positionsToGo] =
      currentBook.positionsToGo;
  }

  const [nextLineMoves, ...linesToGo] = currentBook.currentPosition.linesToGo;
  if (nextLineMoves === undefined) {
    // Start a new book
    training = { ...training, currentBook: null };
  } else {
    // Start a new line
    training = {
      ...training,
      currentBook: {
        ...currentBook,
        currentLine: newCurrentLine(nextLineMoves),
        currentPosition: {
          ...currentBook.currentPosition,
          linesToGo,
        },
      },
    };
    board = newTrainingBoard(currentBook.currentPosition);
  }
  // Regardless of which branch we took, we should update the line count
  training = { ...training, linesTrained: training.linesTrained + 1 };

  return { ...state, training, board };
}

function newCurrentBook(training: Training, book: Book): CurrentBook | null {
  let currentPosition: TrainingPosition;
  let positionsToGo: TrainingPosition[];

  if (book.type === "opening") {
    currentPosition = {
      position: book.position,
      linesToGo: shuffleArray(training, allLines(book.rootNode)),
      color: book.color,
      initialPly: 0,
      initialMoves: book.initialMoves,
    };
    positionsToGo = [];
  } else if (book.type === "endgame") {
    [currentPosition, ...positionsToGo] = shuffleArray(
      training,
      book.positions.map((p) => ({
        position: p.position,
        linesToGo: shuffleArray(training, allLines(p.rootNode)),
        color: p.color,
        initialPly: positionColor(p.position) == "w" ? 0 : 1,
        initialMoves: [],
      })),
    );
  }

  const firstLineMoves = currentPosition.linesToGo[0];
  currentPosition.linesToGo = currentPosition.linesToGo.slice(1);
  if (firstLineMoves === undefined) {
    return null;
  } else {
    return {
      bookId: book.id,
      currentPosition,
      positionsToGo,
      currentLine: newCurrentLine(firstLineMoves),
    };
  }
}

function newCurrentLine(moves: MoveNode[]): CurrentLine {
  return {
    moves,
    index: 0,
    wrongMove: null,
    history: [],
    currentHistoryEntry: {
      score: null,
      otherMoves: [],
    },
  };
}

function newTrainingBoard(currentPosition: TrainingPosition): TrainingBoard {
  return {
    position: currentPosition.position,
    initialPly: currentPosition.initialPly,
    color: positionColor(currentPosition.position),
    currentLineIndex: 0,
    feedback: null,
    annotations: {
      arrows: [],
      squares: [],
    },
    comment: "",
  };
}

function advanceBoard(state: State): State {
  const training = state.training;
  const currentBook = training.currentBook;
  if (currentBook === null) {
    throw Error("TrainingReducer.advanceBoard(): no current book");
  }
  const currentLine = currentBook.currentLine;

  let board = state.board;
  const currentMove = currentLine.moves[board.currentLineIndex];
  if (currentMove === undefined) {
    // User is currently at the end of the line.  The only reason we should be allowing them
    // to advance is if there's a wrong move that we're displaying, so clear it
    return changeCurrentLine(state, (currentLine) => ({
      ...currentLine,
      wrongMove: null,
    }));
  }

  // Advance the board forward
  const position = makeMove(board.position, currentMove.move);
  if (position === null) {
    throw Error(
      `TrainingReducer.advanceBoard(): illegal move: ${currentMove.move}`,
    );
  }

  board = {
    currentLineIndex: board.currentLineIndex + 1,
    initialPly: board.initialPly,
    color: positionColor(position),
    position,
    feedback: board.feedback,
    annotations: currentMove.annotations ?? { squares: [], arrows: [] },
    comment: currentMove.comment ?? "",
  };

  if (board.currentLineIndex > currentLine.index) {
    state = changeCurrentLine(state, (currentLine) => {
      return {
        ...currentLine,
        index: board.currentLineIndex,
        history: [...currentLine.history, currentLine.currentHistoryEntry],
        currentHistoryEntry: {
          score: null,
          otherMoves: [],
        },
      };
    });
  }
  return { ...state, board };
}

function updateCurrentHistoryEntry(
  state: State,
  score: "correct" | "incorrect" | null,
  wrongMove: string | null,
): State {
  let oldScore = null;
  state = changeCurrentLine(state, (currentLine) => {
    if (currentLine.currentHistoryEntry === null) {
      throw Error(
        "TrainingReducer.updateCurrentHistoryEntry(): no current history entry",
      );
    }
    oldScore = currentLine.currentHistoryEntry.score;

    let otherMoves = currentLine.currentHistoryEntry.otherMoves;
    if (wrongMove !== null && wrongMove !== "<skipped>") {
      otherMoves = [...otherMoves, wrongMove as Move];
    }

    return {
      ...currentLine,
      wrongMove,
      currentHistoryEntry: {
        ...currentLine.currentHistoryEntry,
        score,
        otherMoves,
      },
    };
  });
  state = updateCounts(state, oldScore, score);
  return state;
}

function updateLastHistoryEntry(
  state: State,
  score: "correct" | "incorrect" | null,
): State {
  let oldScore = null;
  state = changeCurrentLine(state, (currentLine) => {
    const lastHistoryEntry = currentLine.history.at(-1);

    if (lastHistoryEntry === undefined) {
      throw Error(
        "TrainingReducer.updateLastHistoryEntry(): no last history entry",
      );
    }
    oldScore = lastHistoryEntry.score;

    return {
      ...currentLine,
      wrongMove: score === "incorrect" ? currentLine.wrongMove : null,
      history: [
        ...currentLine.history.slice(0, -1),
        { ...lastHistoryEntry, score },
      ],
    };
  });
  state = updateCounts(state, oldScore, score);
  return state;
}

function updateCounts(
  state: State,
  oldScore: "correct" | "incorrect" | null,
  newScore: "correct" | "incorrect" | null,
): State {
  let correctDelta = 0;
  let incorrectDelta = 0;
  if (newScore == "correct" && oldScore != "correct") {
    correctDelta = 1;
  } else if (newScore != "correct" && oldScore == "correct") {
    correctDelta = -1;
  }
  if (newScore == "incorrect" && oldScore != "incorrect") {
    incorrectDelta = 1;
  } else if (newScore != "incorrect" && oldScore == "incorrect") {
    incorrectDelta = -1;
  }

  return {
    ...state,
    training: {
      ...state.training,
      correctCount: state.training.correctCount + correctDelta,
      incorrectCount: state.training.incorrectCount + incorrectDelta,
    },
    activity: {
      ...state.activity,
      correctCount: state.activity.correctCount + correctDelta,
      incorrectCount: state.activity.incorrectCount + incorrectDelta,
    },
  };
}

function changeCurrentLine(
  state: State,
  changeFunc: (currentLine: CurrentLine) => CurrentLine,
): State {
  const currentBook = state.training.currentBook;
  if (currentBook === null) {
    return state;
  } else {
    const currentLine = currentBook.currentLine;
    return {
      ...state,
      training: {
        ...state.training,
        currentBook: {
          ...currentBook,
          currentLine: changeFunc(currentLine),
        },
      },
    };
  }
}

function setBoardFeedback(
  state: State,
  type: "correct" | "incorrect",
  move: string,
): State {
  const toSquare = moveToSquare(state.board.position, move);
  const feedback = { type, file: 0, rank: 0 };
  if (toSquare !== null) {
    feedback.file = toSquare.charCodeAt(0) - "a".charCodeAt(0);
    feedback.rank = toSquare.charCodeAt(1) - "1".charCodeAt(0);
  }
  return {
    ...state,
    board: { ...state.board, feedback },
  };
}

function unsetBoardFeedback(state: State): State {
  return {
    ...state,
    board: { ...state.board, feedback: null },
  };
}

/**
 * Get all lines for a node
 */
function allLines(node: Node): MoveNode[][] {
  // Special case a completed empty node
  if (childCount(node) == 0) {
    return [];
  }
  const allLines: MoveNode[][] = [];
  const currentLine: MoveNode[] = [];
  function visit(node: Node) {
    if (childCount(node) == 0) {
      allLines.push([...currentLine]);
    } else {
      for (const [move, child] of Object.entries(node.children)) {
        currentLine.push({
          ...child,
          move,
        });
        visit(child);
        currentLine.pop();
      }
    }
  }
  visit(node);
  return allLines;
}

/**
 * Implementation of Durstenfeld shuffle
 *
 * From: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 */
function shuffleArray<T>(training: Training, array: T[]): T[] {
  if (!training.shuffle) {
    return array;
  }
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
