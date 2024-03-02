import { Annotations, Move, Nag } from "./book";
import { buildNode } from "./book.test";
import * as EditorReducer from "./EditorReducer";

// Shorthand functions to call `EditorReducer.reduce` with a specific action
function setMoves(
  state: EditorReducer.State,
  moves: Move[],
): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "set-moves", moves });
}

function add(state: EditorReducer.State): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "add" });
}

function deleteNode(state: EditorReducer.State): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "delete-node" });
}

function deleteBranch(state: EditorReducer.State): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "delete-branch" });
}

function setComment(
  state: EditorReducer.State,
  comment: string,
): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "set-comment", comment });
}

function setAnnotations(
  state: EditorReducer.State,
  annotations: Annotations,
): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "set-annotations", annotations });
}

function setNags(state: EditorReducer.State, nags: Nag[]): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "set-nags", nags });
}

function undo(state: EditorReducer.State): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "undo" });
}

function redo(state: EditorReducer.State): EditorReducer.State {
  return EditorReducer.reduce(state, { type: "redo" });
}

const testNode = buildNode({
  e4: {
    e5: {
      Nf3: {
        Nc6: {
          Bc4: {},
        },
        Nf6: {},
      },
    },
    e6: {},
  },
});

test("set moves", function () {
  let state = EditorReducer.initialState(testNode);
  state = setMoves(state, ["e4", "e5"]);
  expect(state.moves).toEqual(["e4", "e5"]);
  expect(state.node).toEqual(testNode);

  state = setMoves(state, ["d4"]);
  expect(state.moves).toEqual(["d4"]);
  expect(state.node).toEqual(testNode);
});

test("add", function () {
  let state = EditorReducer.initialState(testNode);
  state = setMoves(state, ["e4", "e6", "d4", "d5"]);
  state = add(state);

  expect(state.node).toEqual(
    buildNode({
      e4: {
        e5: {
          Nf3: {
            Nc6: {
              Bc4: {},
            },
            Nf6: {},
          },
        },
        e6: {
          d4: {
            d5: {},
          },
        },
      },
    }),
  );
  expect(state.moves).toEqual(["e4", "e6", "d4", "d5"]);
  // Adding again should be a no-op.
  expect(add(state)).toEqual(state);
});

test("delete node", function () {
  let state = EditorReducer.initialState(testNode);
  state = setMoves(state, ["e4", "e5", "Nf3", "Nc6", "Bc4"]);
  state = deleteNode(state);

  // The Bc4 node should be deleted and `moves` should be set to the previous move
  expect(state.node).toEqual(
    buildNode({
      e4: {
        e5: {
          Nf3: {
            Nc6: {},
            Nf6: {},
          },
        },
        e6: {},
      },
    }),
  );
  // `moves` should be set to the previous move
  expect(state.moves).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  // Deleting with moves that don't correspond to a node should be a no-op
  state = setMoves(state, ["d4"]);
  expect(deleteNode(state)).toEqual(state);
});

test("delete branch", function () {
  let state = EditorReducer.initialState(testNode);
  state = setMoves(state, ["e4", "e5", "Nf3", "Nc6", "Bc4"]);
  state = deleteBranch(state);

  // The entire branch, starting with Nc6 should be deleted
  expect(state.node).toEqual(
    buildNode({
      e4: {
        e5: {
          Nf3: {
            Nf6: {},
          },
        },
        e6: {},
      },
    }),
  );
  // `moves` should be set to the previous move
  expect(state.moves).toEqual(["e4", "e5", "Nf3"]);
  // Deleting with moves that don't correspond to a node should be a no-op
  state = setMoves(state, ["d4"]);
  expect(deleteBranch(state)).toEqual(state);
});

test("set comments, annotations, and nags", function () {
  let state = EditorReducer.initialState(testNode);
  state = setMoves(state, ["e4", "e5", "Nf3", "Nc6", "Bc4"]);
  state = setComment(state, "White develops");
  state = setNags(state, [Nag.GoodMove]);
  state = setAnnotations(state, {
    squares: ["Rd4", "Gd5"],
    arrows: [],
  });

  expect(state.node).toEqual(
    buildNode({
      e4: {
        e5: {
          Nf3: {
            Nc6: {
              Bc4: {
                squares: ["Rd4", "Gd5"],
                arrows: [],
                nags: [Nag.GoodMove],
                comment: "White develops",
              },
            },
            Nf6: {},
          },
        },
        e6: {},
      },
    }),
  );
});

test("undo/redo", function () {
  let state = EditorReducer.initialState(testNode);
  state = setMoves(state, ["e4", "e6", "d4", "d5"]);
  state = add(state);

  expect(undo(state).node).toEqual(testNode);
  expect(redo(undo(state)).node).toEqual(state.node);

  // changing the moves in-between shouldn't affect undo/redo
  state = setMoves(state, ["e6"]);
  expect(undo(state).node).toEqual(testNode);
  expect(redo(undo(state)).node).toEqual(state.node);
});
