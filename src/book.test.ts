import {
    addEndgamePosition,
    addLine,
    combineNodes,
    getDescendant,
    getNodePath,
    lineCount,
    lineCountByPriority,
    newEndgameBook,
    newNode,
    newOpeningBook,
    moveLine,
    newEndgamePosition,
    removeEndgamePosition,
    splitNode,
    updateOpening,
    updateEndgamePosition,
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
            newEndgamePosition("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1", "b"),
        );
        expect(book.position).toEqual("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
        book = addEndgamePosition(
            book,
            newEndgamePosition("4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1", "b"),
        );
        expect(book.position).toEqual("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
        book = removeEndgamePosition(book, book.positions[0].id);
        expect(book.position).toEqual("4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1");
        book = removeEndgamePosition(book, book.positions[0].id);
        expect(book.position).toEqual("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
    });
});

describe("updating books", function () {
    test("updating opening books", function () {
        const source = newOpeningBook("e4", "w", ["e4"]);
        expect(source.lineCount).toEqual(0);
        const updated = updateOpening(
            source,
            buildNode({
                e5: {
                    Nf3: {},
                },
                c5: {
                    Nf3: {},
                },
            }),
        );
        expect(updated.lineCount).toEqual(2);
    });

    test("update endgame books", function () {
        let book = newEndgameBook("Rook endgames");
        book = addEndgamePosition(
            book,
            newEndgamePosition("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1", "b"),
        );
        book = addEndgamePosition(
            book,
            newEndgamePosition("4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1", "b"),
        );
        expect(book.positions.length).toEqual(2);
        expect(book.lineCount).toEqual(0);
        book = updateEndgamePosition(
            book,
            book.positions[0].id,
            buildNode({
                Ra6: {
                    e6: {
                        Ra1: {},
                    },
                    Rg7: {
                        Rb6: {},
                    },
                },
            }),
        );
        expect(book.lineCount).toEqual(2);
        book = updateEndgamePosition(
            book,
            book.positions[1].id,
            buildNode({
                Kf7: {
                    Ra8: {
                        Kg7: {},
                    },
                },
            }),
        );
        expect(book.positions.length).toEqual(2);
        expect(book.lineCount).toEqual(3);
        book = removeEndgamePosition(book, book.positions[0].id);
        expect(book.positions.length).toEqual(1);
        expect(book.lineCount).toEqual(1);
    });

    test("addLine", () => {
        const node = newNode();
        const updated = addLine(node, ["e4", "e5", "Nf3"]);
        expect(updated).toEqual(
            buildNode({
                e4: {
                    e5: {
                        Nf3: {},
                    },
                },
            }),
        );
        // Node shouldn't be updated
        expect(node).toEqual(buildNode({}));
        const updated2 = addLine(updated, ["e4", "e5", "Nc3"]);
        expect(updated2).toEqual(
            buildNode({
                e4: {
                    e5: {
                        Nf3: {},
                        Nc3: {},
                    },
                },
            }),
        );
    });
});

describe("moveLine", () => {
    test("simple case", () => {
        const source = newOpeningBook("e4", "w", ["e4"]);
        const dest = newOpeningBook("e4", "w", ["e4"]);
        source.rootNode = buildNode({
            e5: {
                Nf3: {
                    Nc6: {},
                    Nf6: {},
                },
                Nc3: {},
            },
        });
        const [newSource, newDest] = moveLine(source, dest, [
            "e4",
            "e5",
            "Nf3",
        ]);
        expect(newSource.rootNode).toEqual(
            buildNode({
                e5: {
                    Nc3: {},
                },
            }),
        );
        expect(newDest.rootNode).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                        Nf6: {},
                    },
                },
            }),
        );
        expect(newSource.lineCount).toEqual(1);
        expect(newDest.lineCount).toEqual(2);
    });

    test("merging moves", () => {
        const source = newOpeningBook("e4", "w", ["e4"]);
        const dest = newOpeningBook("e4", "w", ["e4"]);
        source.rootNode = buildNode({
            e5: {
                Nf3: {
                    Nc6: {},
                    Nf6: {},
                },
                Nc3: {},
            },
        });
        dest.rootNode = buildNode({
            e5: {
                Nf3: {
                    Nc6: {},
                },
            },
        });
        const [newSource, newDest] = moveLine(source, dest, [
            "e4",
            "e5",
            "Nf3",
        ]);
        expect(newSource.rootNode).toEqual(
            buildNode({
                e5: {
                    Nc3: {},
                },
            }),
        );
        expect(newDest.rootNode).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                        Nf6: {},
                    },
                },
            }),
        );
    });

    test("different initial moves", () => {
        // 2 books with different initial moves, check that we can move lines from one to another
        let book1 = newOpeningBook("e4", "w", ["e4"]);
        let book2 = newOpeningBook("e4", "w", ["e4", "e5"]);
        book1.rootNode = buildNode({
            e5: {
                Nf3: {
                    Nc6: {},
                    Nf6: {},
                },
                Nc3: {},
            },
        });
        [book1, book2] = moveLine(book1, book2, ["e4", "e5", "Nf3"]);
        expect(book1.rootNode).toEqual(
            buildNode({
                e5: {
                    Nc3: {},
                },
            }),
        );
        expect(book2.rootNode).toEqual(
            buildNode({
                Nf3: {
                    Nc6: {},
                    Nf6: {},
                },
            }),
        );
        // Move the lines the other direction
        [book2, book1] = moveLine(book2, book1, ["e4", "e5", "Nf3"]);
        expect(book1.rootNode).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                        Nf6: {},
                    },
                    Nc3: {},
                },
            }),
        );
        expect(book2.rootNode).toEqual(buildNode({}));
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
        expect(lineCount(getDescendant(node, ["e6"])!)).toEqual(0);
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
