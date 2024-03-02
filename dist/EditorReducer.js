"use strict";
/*
 * Redux-style reducer for an editor session
 *
 * This builds on NodeReducer by also tracking the moves currently on an editor board.
 * These are used as an anchor when updating the node tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduce = exports.initialState = void 0;
const book_1 = require("./book");
const NodeReducer = require("./NodeReducer");
function initialState(node) {
    return {
        ...NodeReducer.initialState(node),
        moves: [],
    };
}
exports.initialState = initialState;
function reduce(state, action) {
    if (action.type == "set-moves") {
        return {
            ...state,
            moves: action.moves,
        };
    }
    else if (action.type == "add") {
        return {
            ...NodeReducer.reduce(state, {
                type: "add",
                moves: state.moves,
            }),
            moves: state.moves,
        };
    }
    else if (action.type == "delete-node") {
        if ((0, book_1.getDescendant)(state.node, state.moves) === null) {
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
    }
    else if (action.type == "delete-branch") {
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
            if ((0, book_1.childCount)(currentNode) > 1 && (0, book_1.childCount)(nextNode) <= 1) {
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
    }
    else if (action.type == "set-comment") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-comment",
                moves: state.moves,
                comment: action.comment,
            }),
            moves: state.moves,
        };
    }
    else if (action.type == "set-annotations") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-annotations",
                moves: state.moves,
                annotations: action.annotations,
            }),
            moves: state.moves,
        };
    }
    else if (action.type == "set-nags") {
        return {
            ...NodeReducer.reduce(state, {
                type: "set-nags",
                moves: state.moves,
                nags: action.nags,
            }),
            moves: state.moves,
        };
    }
    else if (action.type == "undo") {
        return {
            ...NodeReducer.reduce(state, { type: "undo" }),
            moves: state.moves,
        };
    }
    else if (action.type == "redo") {
        return {
            ...NodeReducer.reduce(state, { type: "redo" }),
            moves: state.moves,
        };
    }
    else if (action.type == "reset-undo") {
        return {
            ...state,
            canUndo: false,
            canRedo: false,
            undoStack: [],
            redoStack: [],
        };
    }
}
exports.reduce = reduce;
