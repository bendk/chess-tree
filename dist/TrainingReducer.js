"use strict";
/*
 * Redux-style reducer for a training session
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduce = exports.initialState = void 0;
const book_1 = require("./book");
const training_1 = require("./training");
const chessLogic_1 = require("./chessLogic");
function initialState(training, books) {
    let board;
    if (training.currentBook) {
        board = newTrainingBoard(training.currentBook.currentPosition);
    }
    else {
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
    const booksToGo = shuffleArray(training, (0, training_1.booksForTraining)(books, training.selection)
        .filter((book) => training.startedBooks.indexOf(book.id) == -1)
        .map((book) => book.id));
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
exports.initialState = initialState;
function calcNextStep(training, booksToGo, board) {
    const currentBook = training.currentBook;
    if (currentBook === null) {
        if (booksToGo.length > 0) {
            return {
                type: "book-needed",
                bookId: booksToGo[0],
            };
        }
        else {
            return {
                type: "show-training-summary",
                correctCount: training.correctCount,
                incorrectCount: training.incorrectCount,
            };
        }
    }
    else {
        const currentPosition = currentBook.currentPosition;
        const currentLine = currentBook.currentLine;
        if (board.currentLineIndex >= currentLine.moves.length &&
            (currentLine.wrongMove === null || currentLine.wrongMove === "<skipped>")) {
            return {
                type: "show-line-summary",
                correctCount: currentLine.correctCount,
                incorrectCount: currentLine.incorrectCount,
            };
        }
        if (board.currentLineIndex < currentLine.index) {
            return { type: "move-board-forward-after-delay" };
        }
        else if (board.color != currentPosition.color) {
            if (currentLine.wrongMove === null) {
                return { type: "move-board-forward-after-delay" };
            }
            else {
                return {
                    type: "show-correct-move",
                    move: currentLine.moves[currentLine.index - 1].move,
                };
            }
        }
        else {
            return { type: "choose-move", wrongMove: currentLine.wrongMove };
        }
    }
}
function reduce(state, action) {
    if (action.type == "load-book") {
        state = handleLoadBook(state, action);
    }
    else if (action.type == "move-board-forward") {
        state = handleMoveBoardForward(state, action);
    }
    else if (action.type == "try-move") {
        state = handleTryMove(state, action);
    }
    else if (action.type == "finish-current-line") {
        state = handleFinishCurrentLine(state, action);
    }
    else {
        throw Error(`TraningSession.reduce: Unknown action type: ${action}`);
    }
    return {
        ...state,
        nextStep: calcNextStep(state.training, state.booksToGo, state.board),
    };
}
exports.reduce = reduce;
function handleLoadBook(state, action) {
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
function handleMoveBoardForward(state, action) {
    const { adjustment, fromCurrentLineIndex } = action;
    if (fromCurrentLineIndex != state.board.currentLineIndex) {
        // This action was for a previous board state, ignore it.
        return state;
    }
    // Clear the feedback, since the user did not make any move
    state = unsetBoardFeedback(state);
    const currentBook = state.training.currentBook;
    if (currentBook !== null &&
        state.board.currentLineIndex >= currentBook.currentLine.index) {
        // User is moving past the end of the current line
        if (state.board.color != currentBook.currentPosition.color) {
            // They are going to be guessing again, clear wrongMove
            state = changeCurrentLine(state, (currentLine) => ({
                ...currentLine,
                wrongMove: null,
            }));
        }
        else if (currentBook.currentLine.wrongMove === null) {
            // They skipped their choice, set wrongMove to "<skipped>"
            state = changeCountsAndWrongMove(state, 0, 1, "<skipped>");
        }
    }
    state = advanceBoard(state);
    if (adjustment == "count-as-correct") {
        state = changeCountsAndWrongMove(state, 1, -1, null);
    }
    else if (adjustment == "ignore") {
        state = changeCountsAndWrongMove(state, 0, -1, null);
    }
    return state;
}
function handleTryMove(state, action) {
    const { move } = action;
    const training = state.training;
    if (training.currentBook === null) {
        throw Error("TrainingReducer.handleTryMove(): no current book");
    }
    const currentLine = training.currentBook.currentLine;
    if (currentLine.moves[currentLine.index].move == move) {
        if (currentLine.wrongMove === null) {
            state = changeCountsAndWrongMove(state, 1, 0, null);
            state = setBoardFeedback(state, "correct", move);
        }
        else {
            state = unsetBoardFeedback(state);
        }
        state = advanceBoard(state);
    }
    else {
        // Use choose incorrectly, count an incorrect move if it was their first guess
        if (currentLine.wrongMove === null) {
            state = changeCountsAndWrongMove(state, 0, 1, move);
        }
        else {
            state = changeCountsAndWrongMove(state, 0, 0, move);
        }
        state = setBoardFeedback(state, "incorrect", move);
    }
    return state;
}
function handleFinishCurrentLine(state, _action) {
    let training = state.training;
    let board = state.board;
    const currentBook = training.currentBook;
    if (currentBook === null) {
        throw Error("TrainingReducer.handleFinishCurrentLine(): no current book");
    }
    while (currentBook.currentPosition.linesToGo.length == 0 &&
        currentBook.positionsToGo.length > 0) {
        [currentBook.currentPosition, ...currentBook.positionsToGo] =
            currentBook.positionsToGo;
    }
    const [nextLineMoves, ...linesToGo] = currentBook.currentPosition.linesToGo;
    if (nextLineMoves === undefined) {
        // Start a new book
        training = { ...training, currentBook: null };
    }
    else {
        // Start a new line
        training = {
            ...training,
            currentBook: {
                ...currentBook,
                currentLine: {
                    moves: nextLineMoves,
                    index: 0,
                    correctCount: 0,
                    incorrectCount: 0,
                    wrongMove: null,
                },
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
function newCurrentBook(training, book) {
    let currentPosition;
    let positionsToGo;
    if (book.type === "opening") {
        currentPosition = {
            position: book.position,
            linesToGo: shuffleArray(training, allLines(book.rootNode)),
            color: book.color,
            initialPly: 0,
            initialMoves: book.initialMoves,
        };
        positionsToGo = [];
    }
    else if (book.type === "endgame") {
        [currentPosition, ...positionsToGo] = shuffleArray(training, book.positions.map((p) => ({
            position: p.position,
            linesToGo: shuffleArray(training, allLines(p.rootNode)),
            color: p.color,
            initialPly: (0, chessLogic_1.positionColor)(p.position) == "w" ? 0 : 1,
            initialMoves: [],
        })));
    }
    const firstLineMoves = currentPosition.linesToGo[0];
    currentPosition.linesToGo = currentPosition.linesToGo.slice(1);
    if (firstLineMoves === undefined) {
        return null;
    }
    else {
        return {
            bookId: book.id,
            currentPosition,
            positionsToGo,
            currentLine: {
                moves: firstLineMoves,
                index: 0,
                correctCount: 0,
                incorrectCount: 0,
                wrongMove: null,
            },
        };
    }
}
function newTrainingBoard(currentPosition) {
    return {
        position: currentPosition.position,
        initialPly: currentPosition.initialPly,
        color: (0, chessLogic_1.positionColor)(currentPosition.position),
        currentLineIndex: 0,
        feedback: null,
        annotations: {
            arrows: [],
            squares: [],
        },
        comment: "",
    };
}
function advanceBoard(state) {
    var _a, _b;
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
    const position = (0, chessLogic_1.makeMove)(board.position, currentMove.move);
    if (position === null) {
        throw Error(`TrainingReducer.advanceBoard(): illegal move: ${currentMove.move}`);
    }
    board = {
        currentLineIndex: board.currentLineIndex + 1,
        initialPly: board.initialPly,
        color: (0, chessLogic_1.positionColor)(position),
        position,
        feedback: board.feedback,
        annotations: (_a = currentMove.annotations) !== null && _a !== void 0 ? _a : { squares: [], arrows: [] },
        comment: (_b = currentMove.comment) !== null && _b !== void 0 ? _b : "",
    };
    if (board.currentLineIndex >= currentLine.index) {
        state = changeCurrentLine(state, (currentLine) => ({
            ...currentLine,
            index: board.currentLineIndex,
        }));
    }
    return { ...state, board };
}
function changeCountsAndWrongMove(state, correctAdjustment, incorrectAdjustment, wrongMove) {
    state = {
        ...state,
        training: {
            ...state.training,
            correctCount: state.training.correctCount + correctAdjustment,
            incorrectCount: state.training.incorrectCount + incorrectAdjustment,
        },
        activity: {
            ...state.activity,
            correctCount: state.activity.correctCount + correctAdjustment,
            incorrectCount: state.activity.incorrectCount + incorrectAdjustment,
        },
    };
    return changeCurrentLine(state, (currentLine) => ({
        ...currentLine,
        correctCount: currentLine.correctCount + correctAdjustment,
        incorrectCount: currentLine.incorrectCount + incorrectAdjustment,
        wrongMove: wrongMove,
    }));
}
function changeCurrentLine(state, changeFunc) {
    const currentBook = state.training.currentBook;
    if (currentBook === null) {
        return state;
    }
    else {
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
function setBoardFeedback(state, type, move) {
    const toSquare = (0, chessLogic_1.moveToSquare)(state.board.position, move);
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
function unsetBoardFeedback(state) {
    return {
        ...state,
        board: { ...state.board, feedback: null },
    };
}
/**
 * Get all lines for a node
 */
function allLines(node) {
    // Special case a completed empty node
    if ((0, book_1.childCount)(node) == 0) {
        return [];
    }
    const allLines = [];
    const currentLine = [];
    function visit(node) {
        if ((0, book_1.childCount)(node) == 0) {
            allLines.push([...currentLine]);
        }
        else {
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
function shuffleArray(training, array) {
    if (!training.shuffle) {
        return array;
    }
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
