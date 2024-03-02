"use strict";
/*
 * Redux-style reducer for editing nodes with undo/redo support
 *
 * See `editorReducer` for a higher-level reducer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduce = exports.initialState = void 0;
const book_1 = require("./book");
function initialState(node) {
    return {
        node,
        canUndo: false,
        canRedo: false,
        undoStack: [],
        redoStack: [],
    };
}
exports.initialState = initialState;
function reduce(state, action) {
    let newNode = state.node;
    let changed = false;
    if (action.type == "add") {
        [newNode, changed] = handleAdd(state.node, action.moves, 0);
    }
    else if (action.type == "delete") {
        // If deleting a line caused the parent to become a single-child node, and all grandchildren
        // have the same priority, then that priority should flood upwards to the previous branch
        let priorityToFlood = null;
        const movesToParent = action.moves.slice(0, -1);
        const lastMove = action.moves.at(-1);
        if (lastMove !== undefined) {
            newNode = (0, book_1.updateChild)(state.node, movesToParent, (node) => {
                const childNode = node.children[lastMove];
                if (childNode === undefined) {
                    return node;
                }
                changed = true;
                const newChildEntries = Object.entries(node.children).filter((entry) => entry[0] != lastMove);
                if (newChildEntries.length == 1 &&
                    newChildEntries[0][1].priority != node.priority) {
                    priorityToFlood = newChildEntries[0][1].priority;
                }
                return {
                    ...node,
                    children: Object.fromEntries(newChildEntries),
                };
            });
            if (priorityToFlood !== null) {
                newNode = (0, book_1.updateToStartOfBranch)(newNode, movesToParent, (node) => ({ ...node, priority: priorityToFlood }));
            }
        }
        else if ((0, book_1.childCount)(state.node) > 0) {
            newNode = { ...state.node, children: {} };
            changed = true;
        }
    }
    else if (action.type == "set-comment") {
        newNode = (0, book_1.updateChild)(state.node, action.moves, (node) => {
            changed = changed || node.comment != action.comment;
            return { ...node, comment: action.comment };
        });
    }
    else if (action.type == "set-annotations") {
        newNode = (0, book_1.updateChild)(state.node, action.moves, (node) => {
            changed = changed || node.annotations != action.annotations;
            return { ...node, annotations: action.annotations };
        });
    }
    else if (action.type == "set-nags") {
        newNode = (0, book_1.updateChild)(state.node, action.moves, (node) => {
            changed = changed || node.nags != action.nags;
            return { ...node, nags: action.nags };
        });
    }
    else if (action.type == "set-priority") {
        const moves = (0, book_1.findStartOfBranch)(state.node, action.moves);
        newNode = (0, book_1.updateAllDescendents)(state.node, moves, (node) => {
            changed = changed || node.priority != action.priority;
            return { ...node, priority: action.priority };
        });
    }
    else if (action.type == "undo") {
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
    }
    else if (action.type == "redo") {
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
    }
    else {
        return state;
    }
}
exports.reduce = reduce;
// add is the only action that doesn't use `updateChild`, it can updates multiple
// children at once when it's adding multiple new moves.
function handleAdd(node, moves, moveIndex) {
    const move = moves[moveIndex];
    let addedChild = false;
    if (move === undefined) {
        return [node, false];
    }
    else {
        let childNode = node.children[move];
        if (childNode === undefined) {
            addedChild = true;
            childNode = {
                ...(0, book_1.newNode)(),
                priority: node.priority,
            };
        }
        const [newChild, childChanged] = handleAdd(childNode, moves, moveIndex + 1);
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
