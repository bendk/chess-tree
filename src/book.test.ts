import {
    addEndgamePosition,
    combineNodes,
    findStartOfBranch,
    getDescendant,
    getNodePath,
    lineCount,
    lineCountByPriority,
    newEndgameBook,
    newOpeningBook,
    updateAllDescendents,
    updateToStartOfBranch,
    updateChild,
    removeEndgamePosition,
    splitNode,
    Priority,
} from "./book";
import { buildNode } from "./testutil";

describe("how the position field gets set", () => {
    test("opening book position is set from the initial moves", () => {
        const book = newOpeningBook("e4", "w", ["e4"]);
        expect(book.position).toEqual(
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        );
    });

    test("the endgame book position is set from first position with a placeholder fallback", () => {
        let book = newEndgameBook("Rook endgames");
        expect(book.position).toEqual("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
        book = addEndgamePosition(
            book,
            "b",
            "4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1",
        );
        expect(book.position).toEqual("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
        book = addEndgamePosition(
            book,
            "b",
            "4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1",
        );
        expect(book.position).toEqual("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
        book = removeEndgamePosition(book, book.positions[0].id);
        expect(book.position).toEqual("4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1");
        book = removeEndgamePosition(book, book.positions[0].id);
        expect(book.position).toEqual("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
    });
});

describe("utility functions", () => {
    test("getDescendant", () => {
        const node = buildNode({
            e5: {
                Nf3: {
                    Nc6: {
                        Bc4: {},
                    },
                    Nf6: {},
                },
            },
            e6: {},
        });
        expect(getDescendant(node, [])).toEqual(node);
        expect(getDescendant(node, ["e5"])).toEqual(node.children.e5);
        expect(getDescendant(node, ["e5", "Nf3"])).toEqual(
            node.children.e5.children.Nf3,
        );
        expect(getDescendant(node, ["e5", "Nf3", "Nc6"])).toEqual(
            node.children.e5.children.Nf3.children.Nc6,
        );
        expect(getDescendant(node, ["e5", "Nf3", "Nc6", "d4"])).toEqual(null);
    });

    test("getNodePath", () => {
        const node = buildNode({
            e5: {
                Nf3: {
                    Nc6: {
                        Bc4: {},
                    },
                    Nf6: {},
                },
            },
            e6: {},
        });
        expect(getNodePath(node, ["e5", "Nf3", "Nc6"])).toEqual([
            node,
            node.children.e5,
            node.children.e5.children.Nf3,
            node.children.e5.children.Nf3.children.Nc6,
        ]);
    });

    test("lineCount", () => {
        const node = buildNode({
            e5: {
                Nf3: {
                    Nc6: {
                        Bc4: {},
                    },
                    Nf6: {},
                },
            },
            e6: {},
        });
        expect(lineCount(node)).toEqual(3);
        expect(lineCount(getDescendant(node, ["e5"])!)).toEqual(2);
        expect(lineCount(getDescendant(node, ["e5", "Nf3"])!)).toEqual(2);
        expect(lineCount(getDescendant(node, ["e5", "Nf3", "Nc6"])!)).toEqual(
            1,
        );
        expect(lineCount(getDescendant(node, ["e6"])!)).toEqual(1);
    });

    test("lineCountByPriority", () => {
        const node = buildNode({
            e5: {
                Nf3: {
                    Nc6: {
                        Bc4: {},
                    },
                    Nf6: {},
                    d6: {},
                    f5: {
                        priority: Priority.TrainLast,
                    },
                },
            },
            e6: {
                priority: Priority.TrainFirst,
            },
        });
        expect(lineCountByPriority(node)).toEqual({
            default: 3,
            trainFirst: 1,
            trainLast: 1,
        });
    });
});

test("splitting and combining nodes", () => {
    const node = buildNode({
        e4: {
            e5: {
                Nf3: {},
            },
            c5: {},
        },
        d4: {},
    });
    const splitNodes = splitNode(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        node,
        "<root>",
    );
    const positionToMoves = Object.fromEntries(
        splitNodes.map((splitNode) => {
            const moves = Object.keys(splitNode.children);
            moves.sort();
            return [splitNode.position, moves];
        }),
    );
    expect(positionToMoves).toEqual({
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": [
            "d4",
            "e4",
        ],
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": [
            "c5",
            "e5",
        ],
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1": ["Nf3"],
        "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1": [],
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 1": [],
        "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1": [],
    });
    expect(combineNodes(splitNodes, "<root>")).toEqual(node);
});

describe("utility functions", () => {
    const node = buildNode({
        e4: {
            e5: {
                Nf3: {
                    Nc6: {
                        Bc4: {},
                    },
                },
            },
        },
        d4: {},
    });
    test("findStartOfBranch", () => {
        expect(findStartOfBranch(node, [])).toEqual([]);
        expect(findStartOfBranch(node, ["e4"])).toEqual(["e4"]);
        expect(findStartOfBranch(node, ["e4", "e5"])).toEqual(["e4"]);
        expect(findStartOfBranch(node, ["e4", "e5", "Nf3"])).toEqual(["e4"]);
        expect(findStartOfBranch(node, ["e4", "e5", "Nf3", "Nc6"])).toEqual([
            "e4",
        ]);
    });
    test("updateChild", () => {
        expect(
            updateChild(node, ["e4", "e5"], (node) => ({
                ...node,
                comment: "foo",
            })),
        ).toEqual(
            buildNode({
                e4: {
                    e5: {
                        comment: "foo",
                        Nf3: {
                            Nc6: {
                                Bc4: {},
                            },
                        },
                    },
                },
                d4: {},
            }),
        );
    });
    test("updateAllDescendents", () => {
        expect(
            updateAllDescendents(node, ["e4", "e5"], (node) => ({
                ...node,
                comment: "foo",
            })),
        ).toEqual(
            buildNode({
                e4: {
                    e5: {
                        comment: "foo",
                        Nf3: {
                            comment: "foo",
                            Nc6: {
                                comment: "foo",
                                Bc4: {
                                    comment: "foo",
                                },
                            },
                        },
                    },
                },
                d4: {},
            }),
        );
    });
    test("updateToStartOfBranch", () => {
        expect(
            updateToStartOfBranch(node, ["e4", "e5", "Nf3", "Nc6"], (node) => ({
                ...node,
                comment: "foo",
            })),
        ).toEqual(
            buildNode({
                e4: {
                    comment: "foo",
                    e5: {
                        comment: "foo",
                        Nf3: {
                            comment: "foo",
                            Nc6: {
                                comment: "foo",
                                Bc4: {},
                            },
                        },
                    },
                },
                d4: {},
            }),
        );
    });
});
