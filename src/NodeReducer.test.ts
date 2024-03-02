import { Annotations, Nag, newNode, Move, Node, Priority } from "./book";
import * as NodeReducer from "./NodeReducer";
import { buildNode } from "./testutil";

// Shorthand functions to call `NodeReducer.reduce` with a specific action
function add(state: NodeReducer.State, moves: Move[]): NodeReducer.State {
    return NodeReducer.reduce(state, { type: "add", moves });
}

function delete_(state: NodeReducer.State, moves: Move[]): NodeReducer.State {
    return NodeReducer.reduce(state, { type: "delete", moves });
}

function setComment(
    state: NodeReducer.State,
    moves: Move[],
    comment: string,
): NodeReducer.State {
    return NodeReducer.reduce(state, { type: "set-comment", moves, comment });
}

function setAnnotations(
    state: NodeReducer.State,
    moves: Move[],
    annotations: Annotations,
): NodeReducer.State {
    return NodeReducer.reduce(state, {
        type: "set-annotations",
        moves,
        annotations,
    });
}

function setNags(
    state: NodeReducer.State,
    moves: Move[],
    nags: Nag[],
): NodeReducer.State {
    return NodeReducer.reduce(state, { type: "set-nags", moves, nags });
}

function undo(state: NodeReducer.State): NodeReducer.State {
    return NodeReducer.reduce(state, { type: "undo" });
}

function redo(state: NodeReducer.State): NodeReducer.State {
    return NodeReducer.reduce(state, { type: "redo" });
}

describe("adding lines", () => {
    test("adding lines", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                    },
                },
            }),
        );
        state = add(state, ["e5", "Nf3", "Nf6"]);
        state = add(state, ["e6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                        Nf6: {},
                    },
                },
                e6: {},
            }),
        );
    });

    test("adding existing lines is a noop", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e5", "Nf3", "Nc6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                    },
                },
            }),
        );
    });

    test("adding shorter versions existing lines is a noop", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e5"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                    },
                },
            }),
        );
    });

    test("extending existing lines", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e5", "Nf3", "Nc6", "Bc4"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {
                            Bc4: {},
                        },
                    },
                },
            }),
        );
    });
});

describe("deleting lines", () => {
    test("deleting lines", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e5", "Nf3", "Nf6"]);
        state = add(state, ["e6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                        Nf6: {},
                    },
                },
                e6: {},
            }),
        );
        state = delete_(state, ["e5", "Nf3", "Nf6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {
                        Nc6: {},
                    },
                },
                e6: {},
            }),
        );
        state = delete_(state, ["e5", "Nf3", "Nc6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {},
                },
                e6: {},
            }),
        );
    });

    test("delete can delete multiple lines", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e5", "Nf3", "Nf6"]);
        state = delete_(state, ["e5", "Nf3"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {},
            }),
        );
    });

    test("delete with empty line deletes all children", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e5", "Nf3", "Nf6"]);
        state = add(state, ["e6"]);
        state = delete_(state, []);
        expect(state.node).toEqual(buildNode({}));
    });

    test("delete can truncate lines", () => {
        let state = NodeReducer.initialState(newNode());
        state = add(state, ["e5", "Nf3", "Nc6"]);
        state = add(state, ["e6"]);
        state = delete_(state, ["e5", "Nf3", "Nc6"]);
        expect(state.node).toEqual(
            buildNode({
                e5: {
                    Nf3: {},
                },
                e6: {},
            }),
        );
    });
});

describe("priority", () => {
    const rootNode = buildNode({
        e4: {
            e5: {
                Nf3: {
                    Nc6: {
                        Bc4: {
                            Bc5: {},
                        },
                    },
                },
                Nc3: {},
            },
        },
        d4: {},
    });

    test("set priority after split", () => {
        let state = NodeReducer.initialState(rootNode);
        // setting priority for a branch should set it for all moves in that branch
        state = NodeReducer.reduce(state, {
            type: "set-priority",
            moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
            priority: Priority.TrainFirst,
        });
        expect(state.node).toEqual(
            buildNode({
                e4: {
                    e5: {
                        Nf3: {
                            priority: Priority.TrainFirst,
                            Nc6: {
                                priority: Priority.TrainFirst,
                                Bc4: {
                                    priority: Priority.TrainFirst,
                                    Bc5: {
                                        priority: Priority.TrainFirst,
                                    },
                                },
                            },
                        },
                        Nc3: {},
                    },
                },
                d4: {},
            }),
        );
    });

    test("set priority before split", () => {
        let state = NodeReducer.initialState(rootNode);
        state = NodeReducer.reduce(state, {
            type: "set-priority",
            moves: ["e4"],
            priority: Priority.TrainFirst,
        });
        expect(state.node).toEqual(
            buildNode({
                e4: {
                    priority: Priority.TrainFirst,
                    e5: {
                        priority: Priority.TrainFirst,
                        Nf3: {
                            priority: Priority.TrainFirst,
                            Nc6: {
                                priority: Priority.TrainFirst,
                                Bc4: {
                                    priority: Priority.TrainFirst,
                                    Bc5: {
                                        priority: Priority.TrainFirst,
                                    },
                                },
                            },
                        },
                        Nc3: {
                            priority: Priority.TrainFirst,
                        },
                    },
                },
                d4: {},
            }),
        );
    });

    test("delete one branch, when the other has a priority set", () => {
        let state = NodeReducer.initialState(rootNode);
        state = NodeReducer.reduce(state, {
            type: "set-priority",
            moves: ["e4", "e5", "Nf3", "Nc6"],
            priority: Priority.TrainFirst,
        });
        expect(state.node).toEqual(
            buildNode({
                e4: {
                    e5: {
                        Nf3: {
                            priority: Priority.TrainFirst,
                            Nc6: {
                                priority: Priority.TrainFirst,
                                Bc4: {
                                    priority: Priority.TrainFirst,
                                    Bc5: {
                                        priority: Priority.TrainFirst,
                                    },
                                },
                            },
                        },
                        Nc3: {},
                    },
                },
                d4: {},
            }),
        );
        // Deleting Nc3, should cause the priority to flood upwards to e4, since there's now the only branch.
        state = NodeReducer.reduce(state, {
            type: "delete",
            moves: ["e4", "e5", "Nc3"],
        });
        expect(state.node).toEqual(
            buildNode({
                e4: {
                    priority: Priority.TrainFirst,
                    e5: {
                        priority: Priority.TrainFirst,
                        Nf3: {
                            priority: Priority.TrainFirst,
                            Nc6: {
                                priority: Priority.TrainFirst,
                                Bc4: {
                                    priority: Priority.TrainFirst,
                                    Bc5: {
                                        priority: Priority.TrainFirst,
                                    },
                                },
                            },
                        },
                    },
                },
                d4: {},
            }),
        );
    });

    test("extend branch with priority", () => {
        let state = NodeReducer.initialState(rootNode);
        // setting priority for a branch should set it for all moves in that branch
        state = NodeReducer.reduce(state, {
            type: "set-priority",
            moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
            priority: Priority.TrainFirst,
        });
        state = NodeReducer.reduce(state, {
            type: "add",
            moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"],
        });
        expect(state.node).toEqual(
            buildNode({
                e4: {
                    e5: {
                        Nf3: {
                            priority: Priority.TrainFirst,
                            Nc6: {
                                priority: Priority.TrainFirst,
                                Bc4: {
                                    priority: Priority.TrainFirst,
                                    Bc5: {
                                        priority: Priority.TrainFirst,
                                        c3: {
                                            priority: Priority.TrainFirst,
                                        },
                                    },
                                },
                            },
                        },
                        Nc3: {},
                    },
                },
                d4: {},
            }),
        );
    });
});

test("comments", () => {
    let state = NodeReducer.initialState(newNode());

    // This call does something
    state = add(state, ["e5", "Nf3", "Nc6"]);
    state = setComment(state, ["e5"], "test");
    state = setAnnotations(state, ["e5"], {
        squares: ["Rd4", "Gd5"],
        arrows: [],
    });
    state = setNags(
        state,
        ["e5", "Nf3", "Nc6"],
        [Nag.GoodMove, Nag.EqualPosition],
    );
    expect(state.node).toEqual(
        buildNode({
            e5: {
                comment: "test",
                squares: ["Rd4", "Gd5"],
                Nf3: {
                    Nc6: {
                        nags: [Nag.GoodMove, Nag.EqualPosition],
                    },
                },
            },
        }),
    );
    state = undo(state);
    expect(state.node).toEqual(
        buildNode({
            e5: {
                comment: "test",
                squares: ["Rd4", "Gd5"],
                Nf3: {
                    Nc6: {},
                },
            },
        }),
    );
    state = undo(state);
    expect(state.node).toEqual(
        buildNode({
            e5: {
                comment: "test",
                Nf3: {
                    Nc6: {},
                },
            },
        }),
    );
    state = undo(state);
    expect(state.node).toEqual(
        buildNode({
            e5: {
                Nf3: {
                    Nc6: {},
                },
            },
        }),
    );
    state = redo(state);
    state = redo(state);
    state = redo(state);
    expect(state.node).toEqual(
        buildNode({
            e5: {
                comment: "test",
                squares: ["Rd4", "Gd5"],
                Nf3: {
                    Nc6: {
                        nags: [Nag.GoodMove, Nag.EqualPosition],
                    },
                },
            },
        }),
    );
});

describe("undo/redo", () => {
    test("undo/redo", () => {
        let state = NodeReducer.initialState(newNode());

        expect(state.canUndo).toBeFalsy();
        expect(state.canRedo).toBeFalsy();

        // Add some lines, and remember the node tree after each
        const node0 = { ...state.node };
        state = add(state, ["e5", "Nf3", "Nc6"]);
        const node1 = { ...state.node };
        state = add(state, ["e5", "Nf3", "Nf6"]);
        const node2 = { ...state.node };
        state = add(state, ["e6"]);
        // Delete a single line
        const node3 = { ...state.node };
        state = delete_(state, ["e6"]);
        // Delete a tree of lines
        const node4 = { ...state.node };
        state = delete_(state, ["e5", "Nf3"]);
        const node5 = { ...state.node };

        expect(state.canUndo).toBeTruthy();
        expect(state.canRedo).toBeFalsy();

        function checkUndo(
            correctNode: Node,
            expectedCanUndo: boolean,
            expectedCanRedo: boolean,
        ) {
            state = undo(state);
            expect(state.node).toEqual(correctNode);
            expect(state.canUndo).toEqual(expectedCanUndo);
            expect(state.canRedo).toEqual(expectedCanRedo);
        }

        function checkRedo(
            correctNode: Node,
            expectedCanUndo: boolean,
            expectedCanRedo: boolean,
        ) {
            state = redo(state);
            expect(state.node).toEqual(correctNode);
            expect(state.canUndo).toEqual(expectedCanUndo);
            expect(state.canRedo).toEqual(expectedCanRedo);
        }

        checkUndo(node4, true, true);
        checkUndo(node3, true, true);
        checkRedo(node4, true, true);
        checkRedo(node5, true, false);
        checkUndo(node4, true, true);
        checkUndo(node3, true, true);
        checkUndo(node2, true, true);
        checkUndo(node1, true, true);
        checkUndo(node0, false, true);
        checkRedo(node1, true, true);
        checkRedo(node2, true, true);
        checkRedo(node3, true, true);
        checkRedo(node4, true, true);
        checkRedo(node5, true, false);
    });

    test("undo/redo ignores no-op operations", () => {
        let state = NodeReducer.initialState(newNode());

        // This call does something
        state = add(state, ["e5", "Nf3", "Nc6"]);
        // These calls do nothing
        state = add(state, ["e5", "Nf3"]);
        state = delete_(state, ["e6"]);
        // Undo should skip over the no-op calls
        state = undo(state);
        expect(state.node).toEqual(buildNode({}));
    });
});
