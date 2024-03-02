import { Move, newNode } from "./book";
import { buildNode } from "./testutil";
import { ViewNode, viewNodeTree } from "./viewTree";

/**
 * Like `buildNode` but builds a view node tree
 */
export function buildViewNode(move: Move, nodeSpec: object | number): ViewNode {
    if (typeof nodeSpec === "number") {
        return {
            ...newNode(),
            children: undefined,
            move,
            maxDepth: 0,
            branchCount: 1,
            lineCount: nodeSpec,
        };
    }

    const children: Record<Move, ViewNode> = {};

    for (const [key, value] of Object.entries(nodeSpec)) {
        children[key] = buildViewNode(key, value);
    }

    let maxDepth = 0;
    let lineCount = 0;
    let branchCount = 0;
    if (Object.values(children).length === 0) {
        lineCount = branchCount = 1;
    } else {
        for (const child of Object.values(children)) {
            maxDepth = Math.max(maxDepth, child.maxDepth + 1);
            lineCount += child.lineCount;
            branchCount += child.branchCount;
        }
    }

    return {
        ...newNode(),
        move,
        children,
        maxDepth,
        lineCount,
        branchCount,
    };
}

const testNode = buildNode({
    e4: {
        e5: {
            Nf3: { Nc6: {} },
            Bc4: { Nf6: {} },
        },
        c5: {
            Nf3: {
                d6: {
                    d4: {
                        cxd4: {
                            Nxd4: {},
                            Qxd4: {},
                        },
                    },
                },
            },
            d4: { cxd4: {} },
        },
    },
    d4: {
        Nf6: {
            Bg5: { d5: {} },
            c4: { g6: {} },
        },
    },
});

test("node view with high limits", () => {
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 7,
            maxDepth: 7,
        }),
    ).toEqual({
        leadingMoves: [],
        childNodes: [
            buildViewNode("e4", {
                e5: {
                    Nf3: { Nc6: {} },
                    Bc4: { Nf6: {} },
                },
                c5: {
                    Nf3: {
                        d6: {
                            d4: {
                                cxd4: {
                                    Nxd4: {},
                                    Qxd4: {},
                                },
                            },
                        },
                    },
                    d4: { cxd4: {} },
                },
            }),
            buildViewNode("d4", {
                Nf6: {
                    Bg5: { d5: {} },
                    c4: { g6: {} },
                },
            }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
});

test("hitting depth limit", () => {
    // As the maxDepth decreases, the previous moves should dissapear
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 7,
            maxDepth: 6,
        }),
    ).toEqual({
        leadingMoves: ["e4"],
        childNodes: [
            buildViewNode("e5", {
                Nf3: { Nc6: {} },
                Bc4: { Nf6: {} },
            }),
            buildViewNode("c5", {
                Nf3: {
                    d6: {
                        d4: {
                            cxd4: {
                                Nxd4: {},
                                Qxd4: {},
                            },
                        },
                    },
                },
                d4: { cxd4: {} },
            }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 7,
            maxDepth: 5,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [
            buildViewNode("Nf3", {
                d6: {
                    d4: {
                        cxd4: {
                            Nxd4: {},
                            Qxd4: {},
                        },
                    },
                },
            }),
            buildViewNode("d4", { cxd4: {} }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    // // Further reducing maxDepth should cause the deepest lines to be truncated and replaced with a
    // // line count
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 7,
            maxDepth: 4,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [
            buildViewNode("Nf3", {
                d6: {
                    d4: {
                        cxd4: 2,
                    },
                },
            }),
            buildViewNode("d4", { cxd4: {} }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 7,
            maxDepth: 2,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [
            buildViewNode("Nf3", { d6: 2 }),
            buildViewNode("d4", { cxd4: 1 }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 7,
            maxDepth: 1,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [buildViewNode("Nf3", 2), buildViewNode("d4", 1)],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
});

test("hitting line limit", () => {
    // As the maxLines decreases, the previous moves should dissapear
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 5,
            maxDepth: 7,
        }),
    ).toEqual({
        leadingMoves: ["e4"],
        childNodes: [
            buildViewNode("e5", {
                Nf3: { Nc6: {} },
                Bc4: { Nf6: {} },
            }),
            buildViewNode("c5", {
                Nf3: {
                    d6: {
                        d4: {
                            cxd4: {
                                Nxd4: {},
                                Qxd4: {},
                            },
                        },
                    },
                },
                d4: { cxd4: {} },
            }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 5,
            maxDepth: 7,
        }),
    ).toEqual({
        leadingMoves: ["e4"],
        childNodes: [
            buildViewNode("e5", {
                Nf3: { Nc6: {} },
                Bc4: { Nf6: {} },
            }),
            buildViewNode("c5", {
                Nf3: {
                    d6: {
                        d4: {
                            cxd4: {
                                Nxd4: {},
                                Qxd4: {},
                            },
                        },
                    },
                },
                d4: { cxd4: {} },
            }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 3,
            maxDepth: 7,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [
            buildViewNode("Nf3", {
                d6: {
                    d4: {
                        cxd4: {
                            Nxd4: {},
                            Qxd4: {},
                        },
                    },
                },
            }),
            buildViewNode("d4", { cxd4: {} }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 2,
            maxDepth: 7,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [
            buildViewNode("Nf3", {
                d6: {
                    d4: {
                        cxd4: 2,
                    },
                },
            }),
            buildViewNode("d4", { cxd4: {} }),
        ],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
    expect(
        viewNodeTree({
            rootNode: testNode,
            moves: ["e4", "c5"],
            maxBranches: 1,
            maxDepth: 7,
        }),
    ).toEqual({
        leadingMoves: ["e4", "c5"],
        childNodes: [buildViewNode("Nf3", 2), buildViewNode("d4", 1)],
        comment: "",
        annotations: {
            arrows: [],
            squares: [],
        },
        nags: [],
    });
});
