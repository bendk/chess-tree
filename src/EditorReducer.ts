/*
 * Redux-style reducer for an editor session
 *
 * This builds on NodeReducer by also tracking the moves currently on an editor board.
 * These are used as an anchor when updating the node tree.
 */

import {
    Annotations,
    Move,
    Nag,
    Node,
    Priority,
    childCount,
    getDescendant,
} from "./book";
import * as NodeReducer from "./NodeReducer";

/**
 * State for the reducer
 *
 * @field moves current moves on the board
 *
 */
export type State = NodeReducer.State & {
    moves: Move[];
};

export type Action =
    | ActionSetMoves
    | ActionAdd
    | ActionDeleteBranch
    | ActionDeleteNode
    | ActionSetComment
    | ActionSetAnnotations
    | ActionSetNags
    | ActionSetPriority
    | ActionUndo
    | ActionRedo
    | ActionResetUndo;

/**
 * Change the current `moves`
 */
export interface ActionSetMoves {
    type: "set-moves";
    moves: Move[];
}

/**
 * Add `moves` to `rootNode`
 *
 * Only valid if `moves` does not point to a node in the node tree.
 */
export interface ActionAdd {
    type: "add";
}

/**
 * Delete the current node
 *
 * Only valid if `moves` points to a node in the node tree.
 */
export interface ActionDeleteNode {
    type: "delete-node";
}

/**
 * Delete the current branch
 *
 * This takes finds the last branch in `moves`.  It walks backwards to find the last node with only
 * 1 child.  Then it deletes that node.
 *
 * Only valid if `moves` points to a node in the node tree.
 */
export interface ActionDeleteBranch {
    type: "delete-branch";
}

export interface ActionSetComment {
    type: "set-comment";
    comment: string;
}

export interface ActionSetAnnotations {
    type: "set-annotations";
    annotations: Annotations;
}

export interface ActionSetNags {
    type: "set-nags";
    nags: Nag[];
}

export interface ActionSetPriority {
    type: "set-priority";
    priority: Priority;
}

export interface ActionUndo {
    type: "undo";
}

export interface ActionRedo {
    type: "redo";
}

export interface ActionResetUndo {
    type: "reset-undo";
}

export function initialState(node: Node): State {
    return {
        ...NodeReducer.initialState(node),
        moves: [],
    };
}

export function reduce(state: State, action: Action): State {
    if (action.type == "set-moves") {
        return {
            ...state,
            moves: action.moves,
        };
    } else if (action.type == "add") {
        return {
            ...NodeReducer.reduce(state, {
                type: "add",
                moves: state.moves,
            }),
            moves: state.moves,
        };
    } else if (action.type == "delete-node") {
        if (getDescendant(state.node, state.moves) === null) {
            // moves does not point to a current branch, ignore the action
            return state;
        }
        return {
            ...NodeReducer.reduce(state, {
                type: "delete",
                moves: state.moves,
            }),
            moves: state.moves.slice(0, -1),
        };
    } else if (action.type == "delete-branch") {
        // Find the start of the branch
        let currentNode = state.node;
        let startOfBranch = 0;
        for (let i = 0; i < state.moves.length; i++) {
            const move = state.moves[i];
            const nextNode = currentNode.children[move];
            if (nextNode === undefined) {
                // moves does not point to a current branch, ignore the action
                return state;
            }
            if (childCount(currentNode) > 1 && childCount(nextNode) <= 1) {
                startOfBranch = i + 1;
            }
            currentNode = nextNode;
        }

        return {
            ...NodeReducer.reduce(state, {
                type: "delete",
                moves: state.moves.slice(0, startOfBranch),
            }),
            moves: state.moves.slice(0, startOfBranch - 1),
        };
    } else if (action.type == "set-comment") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-comment",
                moves: state.moves,
                comment: action.comment,
            }),
            moves: state.moves,
        };
    } else if (action.type == "set-annotations") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-annotations",
                moves: state.moves,
                annotations: action.annotations,
            }),
            moves: state.moves,
        };
    } else if (action.type == "set-nags") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-nags",
                moves: state.moves,
                nags: action.nags,
            }),
            moves: state.moves,
        };
    } else if (action.type == "set-priority") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-priority",
                moves: state.moves,
                priority: action.priority,
            }),
            moves: state.moves,
        };
    } else if (action.type == "undo") {
        return {
            ...NodeReducer.reduce(state, { type: "undo" }),
            moves: state.moves,
        };
    } else if (action.type == "redo") {
        return {
            ...NodeReducer.reduce(state, { type: "redo" }),
            moves: state.moves,
        };
    } else if (action.type == "reset-undo") {
        return {
            ...state,
            canUndo: false,
            canRedo: false,
            undoStack: [],
            redoStack: [],
        };
    }
}
