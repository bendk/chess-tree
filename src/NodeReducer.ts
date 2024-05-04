/*
 * Redux-style reducer for editing nodes with undo/redo support
 *
 * See `editorReducer` for a higher-level reducer
 */

import {
    Annotations,
    childCount,
    getSingleChild,
    Move,
    Nag,
    Node,
    NodeCursor,
    Priority,
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
    if (action.type == "undo") {
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
    } else {
        const newNode = calcNewNode(state.node, action);
        if (newNode === null) {
            return state;
        } else {
            return {
                node: newNode,
                canUndo: true,
                canRedo: false,
                undoStack: [state.node, ...state.undoStack],
                redoStack: [],
            };
        }
    }
}

function calcNewNode(rootNode: Node, action: Action): Node | null {
    const [cursor, updatedNode] = NodeCursor.init(rootNode);

    if (action.type == "add") {
        let changed = false;
        for (const move of action.moves) {
            if (cursor.moveOrInsert(move)) {
                changed = true;
            }
        }
        return changed ? updatedNode : null;
    } else if (action.type == "delete") {
        const movesToParent = action.moves.slice(0, -1);
        const lastMove = action.moves.at(-1);

        if (lastMove === undefined) {
            // action.moves was the empty list, try to delete all children
            if (childCount(rootNode) > 0) {
                return { ...rootNode, children: {} };
            } else {
                return null;
            }
        }

        if (!cursor.bulkMove(movesToParent)) {
            return null;
        }
        const childNode = cursor.removeChild(lastMove);
        if (childNode === null) {
            return null;
        }

        // If deleting a line caused the parent to become a single-child node, and all grandchildren
        // have the same priority, then that priority should flood upwards to the previous branch.
        const singleChild = getSingleChild(cursor.current);
        if (singleChild && singleChild.priority != cursor.current.priority) {
            cursor.current.priority = singleChild.priority;
            while (cursor.parent && childCount(cursor.parent.current) == 1) {
                cursor.moveToParent();
                cursor.current.priority = singleChild.priority;
            }
        }
        return updatedNode;
    } else if (action.type == "set-comment") {
        if (!cursor.bulkMove(action.moves)) {
            return null;
        }
        cursor.current.comment = action.comment;
        return updatedNode;
    } else if (action.type == "set-annotations") {
        if (!cursor.bulkMove(action.moves)) {
            return null;
        }
        cursor.current.annotations = action.annotations;
        return updatedNode;
    } else if (action.type == "set-nags") {
        if (!cursor.bulkMove(action.moves)) {
            return null;
        }
        cursor.current.nags = action.nags;
        return updatedNode;
    } else if (action.type == "set-priority") {
        if (!cursor.bulkMove(action.moves)) {
            return null;
        }
        setNodePriority(cursor, action.priority);
        updateAncestorPriority(cursor);
        return updatedNode;
    } else {
        return null;
    }
}

/**
 * Set ancestor node's priority to equal the current node, until the first branch node
 */
function updateAncestorPriority(cursor: NodeCursor) {
    const priorityToSet = cursor.current.priority;
    while (true) {
        const parentNode = cursor.parentNode();
        if (
            parentNode === null ||
            parentNode.priority == priorityToSet ||
            childCount(parentNode) != 1
        ) {
            break;
        }
        parentNode.priority = priorityToSet;
        cursor.moveToParent();
    }
}

/**
 * Set the priority for a node and all its descendents
 */
function setNodePriority(cursor: NodeCursor, priorityToSet: number) {
    cursor.current.priority = priorityToSet;
    for (const childCursor of cursor.childCursors()) {
        setNodePriority(childCursor, priorityToSet);
    }
}
