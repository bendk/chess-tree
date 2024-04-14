import {
    addEndgamePosition,
    newEndgameBook,
    newOpeningBook,
    Book,
    Move,
    Priority,
} from "./book";
import { newTraining, CurrentLineHistoryEntry } from "./training";
import * as TrainingReducer from "./TrainingReducer";
import { buildNode } from "./testutil";

/**
 * Easy way to build up the current line history
 */
export function buildHistory(...spec: string[]): CurrentLineHistoryEntry[] {
    const history: CurrentLineHistoryEntry[] = [];
    for (const item of spec) {
        if (item == "+") {
            history.push({
                score: "correct",
                otherMoves: [],
            });
        } else if (item == "-") {
            history.push({
                score: "incorrect",
                otherMoves: [],
            });
        } else if (item == "=") {
            history.push({
                score: null,
                otherMoves: [],
            });
        } else {
            throw Error(`Invalid buildHistory item: ${item}`);
        }
    }
    return history;
}

const ruyLopez = newOpeningBook("Ruy Lopez", "w", [
    "e4",
    "e5",
    "Nf3",
    "Nc6",
    "Bb5",
]);
ruyLopez.rootNode = buildNode({
    Nf6: {
        squares: ["Ge4"],
        "O-O": {
            Nxe4: {
                d4: {
                    comment: "White temporality sacrifices a pawn",
                    arrows: ["Gf1e1"],
                },
            },
        },
    },
});

let endgame = newEndgameBook("ToyEndgame");
// Toy endgame where the kings start on a1 and a8
endgame = addEndgamePosition(endgame, "b", "k7/8/8/8/8/8/8/K7 w - - 0 1");
endgame.positions[0].rootNode = buildNode({
    Kb1: {
        Kb8: {},
    },
    Kb2: {
        Kb7: {},
    },
});
// Another endgame where the kings start on h1 and h8
endgame = addEndgamePosition(endgame, "w", "7k/8/8/8/8/8/8/7K b - - 0 1");
endgame.positions[1].rootNode = buildNode({
    Kg8: {
        Kg1: {},
    },
});

const books: Book[] = [ruyLopez, endgame];

interface CheckStateData {
    state: TrainingReducer.State;
    nextStep: TrainingReducer.Step;
    correct: number;
    incorrect: number;
    activityCorrect?: number;
    activityIncorrect?: number;
    linesTrained: number;
    currentLineIndex: number;
    comment?: string;
    arrows?: string[];
    squares?: string[];
    history?: CurrentLineHistoryEntry[] | undefined;
}

function checkState(data: CheckStateData) {
    const training = data.state.training;
    expect(data.state.nextStep).toEqual(data.nextStep);
    expect(training.correctCount).toEqual(data.correct);
    expect(training.incorrectCount).toEqual(data.incorrect);
    expect(data.state.activity.correctCount).toEqual(
        data.activityCorrect ?? data.correct,
    );
    expect(data.state.activity.incorrectCount).toEqual(
        data.activityIncorrect ?? data.incorrect,
    );
    expect(training.linesTrained).toEqual(data.linesTrained);
    expect(data.state.board.currentLineIndex).toEqual(data.currentLineIndex);
    expect(data.state.board.comment).toEqual(data.comment ?? "");
    expect(data.state.board.annotations.arrows).toEqual(data.arrows ?? []);
    expect(data.state.board.annotations.squares).toEqual(data.squares ?? []);
    expect(training.currentBook?.currentLine.history).toEqual(data.history);
}

test("trainingSession reducer", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    checkState({
        state,
        nextStep: { type: "book-needed", bookId: ruyLopez.id },
        correct: 0,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 0,
        history: undefined,
    });
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 0,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 0,
        history: [],
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 0,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 1,
        squares: ["Ge4"],
        history: buildHistory("="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "O-O" });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 3,
        history: buildHistory("=", "+", "="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Nf6", "O-O", "Nxe4", "d4"],
            history: buildHistory("=", "+", "=", "+"),
        },
        correct: 2,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 4,
        comment: "White temporality sacrifices a pawn",
        arrows: ["Gf1e1"],
        history: buildHistory("=", "+", "=", "+"),
    });
    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    checkState({
        state,
        nextStep: { type: "book-needed", bookId: endgame.id },
        correct: 2,
        incorrect: 0,
        linesTrained: 1,
        // Keep the same training board state until we load the next book
        currentLineIndex: 4,
        comment: "White temporality sacrifices a pawn",
        arrows: ["Gf1e1"],
    });
    state = TrainingReducer.reduce(state, { type: "load-book", book: endgame });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 2,
        incorrect: 0,
        linesTrained: 1,
        // Keep the same leading moves until we load the next book
        currentLineIndex: 0,
        history: [],
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 2,
        incorrect: 0,
        linesTrained: 1,
        currentLineIndex: 1,
        history: buildHistory("="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "Kb8" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Kb1", "Kb8"],
            history: buildHistory("=", "+"),
        },
        correct: 3,
        incorrect: 0,
        linesTrained: 1,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 3,
        incorrect: 0,
        linesTrained: 2,
        currentLineIndex: 0,
        history: [],
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 3,
        incorrect: 0,
        linesTrained: 2,
        currentLineIndex: 1,
        history: buildHistory("="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "Kb7" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Kb2", "Kb7"],
            history: buildHistory("=", "+"),
        },
        correct: 4,
        incorrect: 0,
        linesTrained: 2,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 4,
        incorrect: 0,
        linesTrained: 3,
        currentLineIndex: 0,
        history: [],
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 4,
        incorrect: 0,
        linesTrained: 3,
        currentLineIndex: 1,
        history: buildHistory("="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "Kg1" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Kg8", "Kg1"],
            history: buildHistory("=", "+"),
        },
        correct: 5,
        incorrect: 0,
        linesTrained: 3,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    checkState({
        state,
        nextStep: {
            type: "show-training-summary",
            correctCount: 5,
            incorrectCount: 0,
        },
        correct: 5,
        incorrect: 0,
        linesTrained: 4,
        currentLineIndex: 2,
    });
});

test("move-board-forward with wrong currentLine index is a no-op", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    expect(
        TrainingReducer.reduce(state, {
            type: "move-board-forward",
            fromCurrentLineIndex: 1,
        }),
    ).toEqual(state);
});

test("initial state when the user is in the middle of a line", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    expect(state.nextStep).toEqual({
        type: "book-needed",
        bookId: ruyLopez.id,
    });
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "O-O" });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });
    // Restart the session, the session should move back to the start of the line and play the
    // moves forward
    state = TrainingReducer.initialState(state.training, books);
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        activityCorrect: 0,
        activityIncorrect: 0,
        currentLineIndex: 0,
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        activityCorrect: 0,
        activityIncorrect: 0,
        currentLineIndex: 1,
        squares: ["Ge4"],
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 1,
    });
    checkState({
        state,
        nextStep: { type: "move-board-forward-after-delay" },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        activityCorrect: 0,
        activityIncorrect: 0,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        activityCorrect: 0,
        activityIncorrect: 0,
        currentLineIndex: 3,
        history: buildHistory("=", "+", "="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Nf6", "O-O", "Nxe4", "d4"],
            history: buildHistory("=", "+", "=", "+"),
        },
        correct: 2,
        incorrect: 0,
        linesTrained: 0,
        activityCorrect: 1,
        activityIncorrect: 0,
        currentLineIndex: 4,
        comment: "White temporality sacrifices a pawn",
        arrows: ["Gf1e1"],
        history: buildHistory("=", "+", "=", "+"),
    });
});

test("wrong moves", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: "d4" },
        correct: 0,
        incorrect: 1,
        linesTrained: 0,
        currentLineIndex: 1,
        squares: ["Ge4"],
        history: buildHistory("="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "Nc3" });
    checkState({
        state,
        nextStep: { type: "choose-move", wrongMove: "Nc3" },
        // A second wrong move shouldn't change the count
        correct: 0,
        incorrect: 1,
        linesTrained: 0,
        currentLineIndex: 1,
        squares: ["Ge4"],
        history: buildHistory("="),
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "O-O" });
    checkState({
        state,
        // Guessing the correct move should move to the show-correct-move step, without changing
        // the counts
        nextStep: { type: "show-correct-move", move: "O-O" },
        correct: 0,
        incorrect: 1,
        linesTrained: 0,
        currentLineIndex: 2,
        history: [
            {
                score: null,
                otherMoves: [],
            },
            {
                score: "incorrect",
                otherMoves: ["d4", "Nc3"],
            },
        ],
    });
    checkState({
        state: TrainingReducer.reduce(state, {
            type: "move-board-forward",
            fromCurrentLineIndex: 2,
        }),
        nextStep: { type: "choose-move", wrongMove: null },
        // Moving the board forward should move to the next choose move step
        correct: 0,
        incorrect: 1,
        linesTrained: 0,
        currentLineIndex: 3,
        history: [
            {
                score: null,
                otherMoves: [],
            },
            {
                score: "incorrect",
                otherMoves: ["d4", "Nc3"],
            },
            {
                score: null,
                otherMoves: [],
            },
        ],
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Nf6", "O-O", "Nxe4", "d4"],
            history: [
                {
                    score: null,
                    otherMoves: [],
                },
                {
                    score: "incorrect",
                    otherMoves: ["d4", "Nc3"],
                },
                {
                    score: null,
                    otherMoves: [],
                },
                {
                    score: "correct",
                    otherMoves: [],
                },
            ],
        },
        correct: 1,
        incorrect: 1,
        linesTrained: 0,
        activityCorrect: 1,
        activityIncorrect: 1,
        currentLineIndex: 4,
        comment: "White temporality sacrifices a pawn",
        arrows: ["Gf1e1"],
        history: [
            {
                score: null,
                otherMoves: [],
            },
            {
                score: "incorrect",
                otherMoves: ["d4", "Nc3"],
            },
            {
                score: null,
                otherMoves: [],
            },
            {
                score: "correct",
                otherMoves: [],
            },
        ],
    });
});

test("wrong move adjustments", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 1,
    });
    // Test moving forward with a "count-as-correct" adjustment
    checkState({
        state: TrainingReducer.reduce(state, {
            type: "move-board-forward",
            fromCurrentLineIndex: 2,
            adjustment: "count-as-correct",
        }),
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 1,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 3,
        history: [
            {
                score: null,
                otherMoves: [],
            },
            {
                score: "correct",
                otherMoves: ["d4"],
            },
            {
                score: null,
                otherMoves: [],
            },
        ],
    });
    // Test moving forward with a "ignore" adjustment
    checkState({
        state: TrainingReducer.reduce(state, {
            type: "move-board-forward",
            fromCurrentLineIndex: 2,
            adjustment: "ignore",
        }),
        nextStep: { type: "choose-move", wrongMove: null },
        correct: 0,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 3,
        history: [
            {
                score: null,
                otherMoves: [],
            },
            {
                score: null,
                otherMoves: ["d4"],
            },
            {
                score: null,
                otherMoves: [],
            },
        ],
    });
});

test("skipping moves", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 1,
    });
    checkState({
        state,
        nextStep: { type: "show-correct-move", move: "O-O" },
        correct: 0,
        incorrect: 1,
        linesTrained: 0,
        currentLineIndex: 2,
        history: buildHistory("=", "-"),
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 3,
    });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Nf6", "O-O", "Nxe4", "d4"],
            history: buildHistory("=", "-", "=", "-"),
        },
        correct: 0,
        incorrect: 2,
        linesTrained: 0,
        currentLineIndex: 4,
        comment: "White temporality sacrifices a pawn",
        arrows: ["Gf1e1"],
        history: buildHistory("=", "-", "=", "-"),
    });
});

test("moves at the wrong time", () => {
    let state = TrainingReducer.initialState(
        newTraining(books, { type: "all" }, false),
        books,
    );
    checkState({
        state,
        nextStep: { type: "book-needed", bookId: ruyLopez.id },
        correct: 0,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 0,
        history: undefined,
    });
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: ruyLopez,
    });
    // When we're moving the board forward, any move attempt should be ignored
    expect(state.nextStep.type).toEqual("move-board-forward-after-delay");
    expect(
        TrainingReducer.reduce(state, { type: "try-move", move: "Nf6" }),
    ).toBe(state);
    expect(
        TrainingReducer.reduce(state, { type: "try-move", move: "a6" }),
    ).toBe(state);
    // Also when we're showing the correct move
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "O-O" });
    expect(state.nextStep.type).toEqual("show-correct-move");
    expect(
        TrainingReducer.reduce(state, { type: "try-move", move: "d4" }),
    ).toBe(state);
    expect(
        TrainingReducer.reduce(state, { type: "try-move", move: "O-O" }),
    ).toBe(state);
    // Also when we're showing the line summary
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "d4" });
    expect(state.nextStep.type).toEqual("show-line-summary");
    expect(
        TrainingReducer.reduce(state, { type: "try-move", move: "exd4" }),
    ).toBe(state);
});

const frenchDefense = newOpeningBook("French Defense", "w", [
    "e4",
    "e6",
    "d4",
    "d5",
    "Nc3",
]);
frenchDefense.rootNode = buildNode({
    dxe4: {
        Nxe4: {},
    },
    Nf6: {
        e5: {
            Nfd7: {
                priority: Priority.TrainFirst,
                f4: {
                    priority: Priority.TrainFirst,
                },
            },
            Ne4: {
                priority: Priority.TrainLast,
                Nxe4: {
                    priority: Priority.TrainLast,
                },
            },
        },
    },
    Bb4: {
        priority: Priority.TrainFirst,
        e5: {
            priority: Priority.TrainFirst,
        },
    },
});

function checkMoves(state: TrainingReducer.State, expectedMoves: Move[]) {
    expect(
        state.training.currentBook?.currentLine.moves.map((m) => m.move),
    ).toEqual(expectedMoves);
}

test("trainingSession ordering by priority", () => {
    let state = TrainingReducer.initialState(
        newTraining([frenchDefense], { type: "all" }, false),
        [frenchDefense],
    );
    state = TrainingReducer.reduce(state, {
        type: "load-book",
        book: frenchDefense,
    });
    // Train the high-priority lines first.  (For the unit tests,
    // high-priority lines will be ordered by the order of their keys.
    // In a real session, they will be randomly ordered).
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkMoves(state, ["Nf6"]);
    state = TrainingReducer.reduce(state, { type: "try-move", move: "e5" });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    checkMoves(state, ["Nf6", "e5", "Nfd7"]);
    state = TrainingReducer.reduce(state, { type: "try-move", move: "f4" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Nf6", "e5", "Nfd7", "f4"],
            history: buildHistory("=", "+", "=", "+"),
        },
        correct: 2,
        incorrect: 0,
        linesTrained: 0,
        currentLineIndex: 4,
        history: buildHistory("=", "+", "=", "+"),
    });

    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkMoves(state, ["Bb4"]);
    state = TrainingReducer.reduce(state, { type: "try-move", move: "e5" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Bb4", "e5"],
            history: buildHistory("=", "+"),
        },
        correct: 3,
        incorrect: 0,
        linesTrained: 1,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });

    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    checkMoves(state, ["dxe4"]);
    state = TrainingReducer.reduce(state, { type: "try-move", move: "Nxe4" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["dxe4", "Nxe4"],
            history: buildHistory("=", "+"),
        },
        correct: 4,
        incorrect: 0,
        linesTrained: 2,
        currentLineIndex: 2,
        history: buildHistory("=", "+"),
    });

    state = TrainingReducer.reduce(state, { type: "finish-current-line" });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 0,
    });
    state = TrainingReducer.reduce(state, { type: "try-move", move: "e5" });
    state = TrainingReducer.reduce(state, {
        type: "move-board-forward",
        fromCurrentLineIndex: 2,
    });
    checkMoves(state, ["Nf6", "e5", "Ne4"]);
    state = TrainingReducer.reduce(state, { type: "try-move", move: "Nxe4" });
    checkState({
        state,
        nextStep: {
            type: "show-line-summary",
            moves: ["Nf6", "e5", "Ne4", "Nxe4"],
            history: buildHistory("=", "+", "=", "+"),
        },
        correct: 6,
        incorrect: 0,
        linesTrained: 3,
        currentLineIndex: 4,
        history: buildHistory("=", "+", "=", "+"),
    });
});
