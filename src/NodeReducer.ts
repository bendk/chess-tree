/*
 * Redux-style reducer for editing nodes with undo/redo support
 *
 * See `editorReducer` for a higher-level reducer
 */

import {
  Annotations,
  Move,
  Nag,
  Node,
  childCount,
  newNode,
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
  let newRootNode = state.node;
  let changed = false;

  if (action.type == "add") {
    [newRootNode, changed] = handleAdd(state.node, action.moves, 0);
  } else if (action.type == "delete") {
    const lastMove = action.moves.at(-1);
    if (lastMove !== undefined) {
      newRootNode = updateChild(
        state.node,
        action.moves.slice(0, -1),
        (node) => {
          if (node.children[lastMove] === undefined) {
            return node;
          }
          changed = true;
          return {
            ...node,
            children: Object.fromEntries(
              Object.entries(node.children).filter(
                (entry) => entry[0] != lastMove,
              ),
            ),
          };
        },
      );
    } else if (childCount(state.node) > 0) {
      newRootNode = { ...state.node, children: {} };
      changed = true;
    }
  } else if (action.type == "set-comment") {
    newRootNode = updateChild(state.node, action.moves, (node) => {
      changed = changed || node.comment != action.comment;
      return { ...node, comment: action.comment };
    });
  } else if (action.type == "set-annotations") {
    newRootNode = updateChild(state.node, action.moves, (node) => {
      changed = changed || node.annotations != action.annotations;
      return { ...node, annotations: action.annotations };
    });
  } else if (action.type == "set-nags") {
    newRootNode = updateChild(state.node, action.moves, (node) => {
      changed = changed || node.nags != action.nags;
      return { ...node, nags: action.nags };
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
      node: newRootNode,
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
      childNode = newNode();
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
