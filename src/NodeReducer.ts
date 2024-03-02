/*
 * Redux-style reducer for editing nodes with undo/redo support
 *
 * See `editorReducer` for a higher-level reducer
 */

import {
    Annotations,
    childCount,
    findStartOfBranch,
    Move,
    Nag,
    newNode,
    Node,
    Priority,
    updateAllDescendents,
    updateToStartOfBranch,
    updateChild,
} from "./book";

export interface State {
    node: Node;
    canUndo: boolean;
    canRedo: boolean;
    undoStack: Node[];
    redoStack: Node[];
}

export type Action =
    | ActionAdd
    | ActionDelete
    | ActionSetComment
    | ActionSetAnnotations
    | ActionSetNags
    | ActionSetPriority
    | ActionUndo
    | ActionRedo;

export interface ActionAdd {
    type: "add";
    moves: Move[];
}

export interface ActionDelete {
    type: "delete";
    moves: Move[];
}

export interface ActionSetComment {
    type: "set-comment";
    moves: Move[];
    comment: string;
}

export interface ActionSetAnnotations {
    type: "set-annotations";
    moves: Move[];
    annotations: Annotations;
}

export interface ActionSetNags {
    type: "set-nags";
    moves: Move[];
    nags: Nag[];
}

export interface ActionSetPriority {
    type: "set-priority";
    moves: Move[];
    priority: Priority;
}

export interface ActionUndo {
    type: "undo";
}

export interface ActionRedo {
    type: "redo";
}

export function initialState(node: Node): State {
    return {
        node,
        canUndo: false,
        canRedo: false,
        undoStack: [],
        redoStack: [],
    };
}

export function reduce(state: State, action: Action): State {
    let newNode = state.node;
    let changed = false;

    if (action.type == "add") {
        [newNode, changed] = handleAdd(state.node, action.moves, 0);
    } else if (action.type == "delete") {
        // If deleting a line caused the parent to become a single-child node, and all grandchildren
        // have the same priority, then that priority should flood upwards to the previous branch
        let priorityToFlood: Priority | null = null;
        const movesToParent = action.moves.slice(0, -1);
        const lastMove = action.moves.at(-1);
        if (lastMove !== undefined) {
            newNode = updateChild(state.node, movesToParent, (node) => {
                const childNode = node.children[lastMove];
                if (childNode === undefined) {
                    return node;
                }
                changed = true;
                const newChildEntries = Object.entries(node.children).filter(
                    (entry) => entry[0] != lastMove,
                );
                if (
                    newChildEntries.length == 1 &&
                    newChildEntries[0][1].priority != node.priority
                ) {
                    priorityToFlood = newChildEntries[0][1].priority;
                }
                return {
                    ...node,
                    children: Object.fromEntries(newChildEntries),
                };
            });
            if (priorityToFlood !== null) {
                newNode = updateToStartOfBranch(
                    newNode,
                    movesToParent,
                    (node) => ({ ...node, priority: priorityToFlood }),
                );
            }
        } else if (childCount(state.node) > 0) {
            newNode = { ...state.node, children: {} };
            changed = true;
        }
    } else if (action.type == "set-comment") {
        newNode = updateChild(state.node, action.moves, (node) => {
            changed = changed || node.comment != action.comment;
            return { ...node, comment: action.comment };
        });
    } else if (action.type == "set-annotations") {
        newNode = updateChild(state.node, action.moves, (node) => {
            changed = changed || node.annotations != action.annotations;
            return { ...node, annotations: action.annotations };
        });
    } else if (action.type == "set-nags") {
        newNode = updateChild(state.node, action.moves, (node) => {
            changed = changed || node.nags != action.nags;
            return { ...node, nags: action.nags };
        });
    } else if (action.type == "set-priority") {
        const moves = findStartOfBranch(state.node, action.moves);
        newNode = updateAllDescendents(state.node, moves, (node) => {
            changed = changed || node.priority != action.priority;
            return { ...node, priority: action.priority };
        });
    } else if (action.type == "undo") {
        const [node, ...rest] = state.undoStack;
        if (node) {
            return {
                node: node,
                undoStack: rest,
                redoStack: [state.node, ...state.redoStack],
                canUndo: rest.length > 0,
                canRedo: true,
            };
        }
    } else if (action.type == "redo") {
        const [node, ...rest] = state.redoStack;
        if (node) {
            return {
                node: node,
                undoStack: [state.node, ...state.undoStack],
                redoStack: rest,
                canUndo: true,
                canRedo: rest.length > 0,
            };
        }
    }
    if (changed) {
        return {
            node: newNode,
            canUndo: true,
            canRedo: false,
            undoStack: [state.node, ...state.undoStack],
            redoStack: [],
        };
    } else {
        return state;
    }
}

// add is the only action that doesn't use `updateChild`, it can updates multiple
// children at once when it's adding multiple new moves.
function handleAdd(
    node: Node,
    moves: Move[],
    moveIndex: number,
): [Node, boolean] {
    const move = moves[moveIndex];
    let addedChild = false;
    if (move === undefined) {
        return [node, false];
    } else {
        let childNode = node.children[move];
        if (childNode === undefined) {
            addedChild = true;
            childNode = {
                ...newNode(),
                priority: node.priority,
            };
        }

        const [newChild, childChanged] = handleAdd(
            childNode,
            moves,
            moveIndex + 1,
        );
        const updatedNode = {
            ...node,
            children: {
                ...node.children,
                [move]: newChild,
            },
        };
        return [updatedNode, addedChild || childChanged];
    }
}
