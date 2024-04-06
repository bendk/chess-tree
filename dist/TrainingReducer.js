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
        const nextBook = booksToGo[0];
        if (nextBook !== undefined) {
            return {
                type: "book-needed",
                bookId: nextBook,
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
    const currentLine = currentBook.currentLine;
    const currentNode = getCurrentNode(currentBook);
    if ((0, book_1.childCount)(currentNode) == 0) {
        return {
            type: "show-line-summary",
            moves: currentLine.moves.map((n) => n.move),
            history: currentLine.history,
        };
    }
    if (board.currentLineIndex < currentLine.moves.length) {
        // The board is before the last item of `moves`. Tell the UI to animate through the moves.
        return { type: "move-board-forward-after-delay" };
    }
    else if (board.color == currentBook.currentPosition.color) {
        // User needs to choose the move
        return { type: "choose-move", wrongMove: currentLine.wrongMove };
    }
    else if (currentLine.wrongMove !== null) {
        // User needs to choose wrong for the last move, pause to show them the correct move
        return {
            type: "show-correct-move",
            move: currentLine.moves.at(-1).move,
        };
    }
    else {
        // The board is on the opponent's move, animate past it.
        return { type: "move-board-forward-after-delay" };
    }
}
function reduce(state, action) {
    let newState;
    if (action.type == "load-book") {
        newState = handleLoadBook(state, action);
    }
    else if (action.type == "move-board-forward") {
        newState = handleMoveBoardForward(state, action);
    }
    else if (action.type == "try-move") {
        newState = handleTryMove(state, action);
    }
    else if (action.type == "finish-current-line") {
        newState = handleFinishCurrentLine(state, action);
    }
    else {
        throw Error(`TraningSession.reduce: Unknown action type: ${action}`);
    }
    if (newState === state) {
        return state;
    }
    else {
        return {
            ...newState,
            nextStep: calcNextStep(newState.training, newState.booksToGo, newState.board),
        };
    }
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
    const currentBook = state.training.currentBook;
    if (currentBook === null) {
        throw Error(`TraningSession.reduce: Unknown action type: ${action}`);
    }
    const movingPastCurrentMoves = state.board.currentLineIndex >= currentBook.currentLine.moves.length;
    const userToMove = state.board.color == currentBook.currentPosition.color;
    const userPlayedWrongMove = currentBook.currentLine.wrongMove !== null;
    // Clear any feedback from the last user choice.
    state = unsetBoardFeedback(state);
    if (movingPastCurrentMoves) {
        state = extendCurrentLineMoves(state);
        if (adjustment == "count-as-correct") {
            state = updateLastHistoryEntry(state, "correct");
        }
        else if (adjustment == "ignore") {
            state = updateLastHistoryEntry(state, null);
        }
        if (!userToMove) {
            // Moving to the next user choice, clear `wrongMove`
            state = changeCurrentLine(state, (currentLine) => ({
                ...currentLine,
                wrongMove: null,
            }));
        }
        else if (!userPlayedWrongMove) {
            // Skipping a user choice without them choosing anything, set wrong move to "<skipped>"
            state = updateCurrentHistoryEntry(state, "incorrect", "<skipped>");
        }
        state = pushCurrentHistory(state);
    }
    state = advanceBoard(state);
    return state;
}
function handleTryMove(state, action) {
    if (state.nextStep.type != "choose-move") {
        // Ignore move attempts when it's not the user's turn to move.
        return state;
    }
    const { move } = action;
    const userChoseWrong = state.training.currentBook.currentLine.wrongMove !== null;
    let correct;
    [state, correct] = checkUserMove(state, move);
    if (correct) {
        if (!userChoseWrong) {
            // If it was the first guess, give them points
            state = updateCurrentHistoryEntry(state, "correct", null);
            state = setBoardFeedback(state, "correct", move);
        }
        else {
            // If they guessed incorrectly before, remove the error feedback
            state = unsetBoardFeedback(state);
        }
        state = pushCurrentHistory(state);
        state = advanceBoard(state);
    }
    else {
        // User chose incorrectly
        state = updateCurrentHistoryEntry(state, "incorrect", move);
        state = setBoardFeedback(state, "incorrect", move);
    }
    return state;
}
function handleFinishCurrentLine(state, _action) {
    state = removeCurrentLineFromNode(state);
    state = changeCurrentLine(state, (_currentLine) => newCurrentLine());
    let training = state.training;
    let board = state.board;
    const currentBook = training.currentBook;
    while ((0, book_1.childCount)(currentBook.currentPosition.rootNode) == 0 &&
        currentBook.positionsToGo.length > 0) {
        [currentBook.currentPosition, ...currentBook.positionsToGo] =
            currentBook.positionsToGo;
    }
    if ((0, book_1.childCount)(currentBook.currentPosition.rootNode) == 0) {
        // Start a new book
        training = { ...training, currentBook: null };
    }
    else {
        // Start a new line
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
            rootNode: book.rootNode,
            color: book.color,
            initialPly: 0,
            initialMoves: book.initialMoves,
        };
        positionsToGo = [];
    }
    else if (book.type === "endgame") {
        [currentPosition, ...positionsToGo] = shuffleArray(training, book.positions.map((p) => ({
            position: p.position,
            rootNode: p.rootNode,
            color: p.color,
            initialPly: (0, chessLogic_1.positionColor)(p.position) == "w" ? 0 : 1,
            initialMoves: [],
        })));
    }
    if ((0, book_1.childCount)(currentPosition.rootNode) === 0) {
        return null;
    }
    else {
        return {
            bookId: book.id,
            currentPosition,
            positionsToGo,
            currentLine: newCurrentLine(),
        };
    }
}
function newCurrentLine() {
    return {
        moves: [],
        wrongMove: null,
        history: [],
        currentHistoryEntry: {
            score: null,
            otherMoves: [],
        },
    };
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
        throw Error("TrainingReducer.advanceBoard: moving past end of the line");
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
    return { ...state, board };
}
function updateCurrentHistoryEntry(state, score, wrongMove) {
    let oldScore = null;
    state = changeCurrentLine(state, (currentLine) => {
        if (currentLine.currentHistoryEntry === null) {
            throw Error("TrainingReducer.updateCurrentHistoryEntry(): no current history entry");
        }
        oldScore = currentLine.currentHistoryEntry.score;
        let otherMoves = currentLine.currentHistoryEntry.otherMoves;
        if (wrongMove !== null && wrongMove !== "<skipped>") {
            otherMoves = [...otherMoves, wrongMove];
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
function updateLastHistoryEntry(state, score) {
    let oldScore = null;
    state = changeCurrentLine(state, (currentLine) => {
        const lastHistoryEntry = currentLine.history.at(-1);
        if (lastHistoryEntry === undefined) {
            throw Error("TrainingReducer.updateLastHistoryEntry(): no last history entry");
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
function pushCurrentHistory(state) {
    return changeCurrentLine(state, (currentLine) => {
        return {
            ...currentLine,
            history: [...currentLine.history, currentLine.currentHistoryEntry],
            currentHistoryEntry: {
                score: null,
                otherMoves: [],
            },
        };
    });
}
function updateCounts(state, oldScore, newScore) {
    let correctDelta = 0;
    let incorrectDelta = 0;
    if (newScore == "correct" && oldScore != "correct") {
        correctDelta = 1;
    }
    else if (newScore != "correct" && oldScore == "correct") {
        correctDelta = -1;
    }
    if (newScore == "incorrect" && oldScore != "incorrect") {
        incorrectDelta = 1;
    }
    else if (newScore != "incorrect" && oldScore == "incorrect") {
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
 * Extend the moves for the current line
 *
 * This is called when the user moves past the end of the moves.  Pick a new move randomly, based on
 * the total line counts of all children.  Note that this is valid both when we are picking a new
 * move for the oppenent and also when the user skips over their own move.
 */
function extendCurrentLineMoves(state) {
    const currentBook = state.training.currentBook;
    if (currentBook === null) {
        throw Error("TrainingReducer.extendCurrentLineMoves(): no current book");
    }
    const currentNode = getCurrentNode(currentBook);
    const allMoves = Object.keys(currentNode.children);
    if (allMoves.length == 0) {
        throw Error("TrainingReducer.extendCurrentLineMoves(): no moves to choose");
    }
    let move;
    if (state.training.shuffle) {
        move = pickMoveRandomly((0, book_1.calcNodeInfo)(currentNode).childLineCount);
    }
    else {
        move = allMoves[0];
    }
    const moveNode = { ...currentNode.children[move], move };
    return changeCurrentLine(state, (currentLine) => ({
        ...currentLine,
        moves: [...currentLine.moves, moveNode],
    }));
}
/**
 * Check if the user's move is correct.
 *
 * Note: if there are multiple moves in the book than any of them is counted correct.
 * Choosing one of the moves causes all other possibilities to be removed from the training session.
 */
function checkUserMove(state, userMove) {
    const currentBook = state.training.currentBook;
    if (currentBook === null) {
        throw Error("TrainingReducer.checkUserMove(): no current book");
    }
    // Use `updateChild` to try to find the child node that matches the user move.
    // If we find that, then remove all other moves for the node.
    let childNode;
    const rootNode = (0, book_1.updateChild)(currentBook.currentPosition.rootNode, currentBook.currentLine.moves.map((m) => m.move), (node) => {
        childNode = node.children[userMove];
        if (childNode !== undefined) {
            return {
                ...node,
                children: {
                    [userMove]: childNode,
                },
            };
        }
        else {
            return node;
        }
    });
    // If we found the child node, then append it to the current moves
    let moves = currentBook.currentLine.moves;
    if (childNode) {
        moves = [...moves, { ...childNode, move: userMove }];
    }
    state = {
        ...state,
        training: {
            ...state.training,
            currentBook: {
                ...currentBook,
                currentLine: {
                    ...currentBook.currentLine,
                    moves,
                },
                currentPosition: {
                    ...currentBook.currentPosition,
                    rootNode,
                },
            },
        },
    };
    return [state, childNode !== undefined];
}
/**
 * Remove the current line from the state.training.currentBook.currentPosition.rootNode
 */
function removeCurrentLineFromNode(state) {
    const currentBook = state.training.currentBook;
    if (currentBook === null) {
        throw Error("TrainingReducer.removeCurrentLineFromNode(): no current book");
    }
    let node = currentBook.currentPosition.rootNode;
    let lastBranchIndex = -1;
    currentBook.currentLine.moves.forEach((move, index) => {
        if ((0, book_1.childCount)(node) > 1) {
            lastBranchIndex = index;
        }
        node = node.children[move.move];
        if (node === undefined) {
            const moves = currentBook.currentLine.moves
                .map((m) => m.move)
                .join(", ");
            throw Error(`TrainingReducer.removeCurrentLineFromNode(): current moves are illegal (${moves})`);
        }
    });
    let rootNode;
    if (lastBranchIndex == -1) {
        // No branches found, meaning this was the last branch
        rootNode = {
            ...currentBook.currentPosition.rootNode,
            children: {},
        };
    }
    else {
        const moveAfterBranch = currentBook.currentLine.moves[lastBranchIndex].move;
        rootNode = (0, book_1.updateChild)(currentBook.currentPosition.rootNode, currentBook.currentLine.moves
            .slice(0, lastBranchIndex)
            .map((m) => m.move), (node) => ({
            ...node,
            children: Object.fromEntries(Object.entries(node.children).filter(([move, _node]) => move != moveAfterBranch)),
        }));
    }
    return {
        ...state,
        training: {
            ...state.training,
            currentBook: {
                ...currentBook,
                currentPosition: {
                    ...currentBook.currentPosition,
                    rootNode,
                },
            },
        },
    };
}
function getCurrentNode(currentBook) {
    const rootNode = currentBook.currentPosition.rootNode;
    const descendant = (0, book_1.getDescendant)(rootNode, currentBook.currentLine.moves.map((m) => m.move));
    if (descendant === null) {
        throw Error("TrainingReducer.getCurrentNode(): descendent not found");
    }
    return descendant;
}
/**
 * Pick a move randomly, but with each move having a different weight
 *
 * Used to pick a random move from a node, where each weight is the number of lines for that move.
 */
function pickMoveRandomly(moveMap) {
    const moves = Object.keys(moveMap);
    if (moves.length == 0) {
        throw Error("TrainingReducer.pickMove(): no moves to pick from");
    }
    const totalWeight = Object.values(moveMap).reduce((a, b) => a + b, 0);
    let choice = Math.floor(Math.random() * totalWeight);
    for (const [move, weight] of Object.entries(moveMap)) {
        if (choice < weight) {
            return move;
        }
        else {
            choice -= weight;
        }
    }
    // We should never get here if Math.random() is correct, but if so just return an arbitrary move
    return moves[0];
}
/**
 * Implementation of Durstenfeld shuffle
 *
 * Used to shuffle books and endgame positions when training
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
