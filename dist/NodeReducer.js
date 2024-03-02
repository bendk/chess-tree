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
    let newRootNode = state.node;
    let changed = false;
    if (action.type == "add") {
        [newRootNode, changed] = handleAdd(state.node, action.moves, 0);
    }
    else if (action.type == "delete") {
        const lastMove = action.moves.at(-1);
        if (lastMove !== undefined) {
            newRootNode = handleAction(state.node, action.moves.slice(0, -1), 0, "delete", (node) => {
                if (node.children[lastMove] === undefined) {
                    return node;
                }
                changed = true;
                return {
                    ...node,
                    children: Object.fromEntries(Object.entries(node.children).filter((entry) => entry[0] != lastMove)),
                };
            });
        }
        else if ((0, book_1.childCount)(state.node) > 0) {
            newRootNode = { ...state.node, children: {} };
            changed = true;
        }
    }
    else if (action.type == "set-comment") {
        newRootNode = handleAction(state.node, action.moves, 0, "set-comment", (node) => {
            changed = changed || node.comment != action.comment;
            return { ...node, comment: action.comment };
        });
    }
    else if (action.type == "set-annotations") {
        newRootNode = handleAction(state.node, action.moves, 0, "set-annotations", (node) => {
            changed = changed || node.annotations != action.annotations;
            return { ...node, annotations: action.annotations };
        });
    }
    else if (action.type == "set-nags") {
        newRootNode = handleAction(state.node, action.moves, 0, "set-nags", (node) => {
            changed = changed || node.nags != action.nags;
            return { ...node, nags: action.nags };
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
            node: newRootNode,
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
// Handle add is special cased, since it's the only action that will insert new nodes
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
            childNode = (0, book_1.newNode)();
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
// handleAction handles all actions other than add
function handleAction(node, moves, moveIndex, operationName, operation) {
    const move = moves[moveIndex];
    if (move === undefined) {
        return operation(node);
    }
    else {
        const childNode = node.children[move];
        if (childNode === undefined) {
            return node;
        }
        return {
            ...node,
            children: {
                ...node.children,
                [move]: handleAction(childNode, moves, moveIndex + 1, operationName, operation),
            },
        };
    }
}
