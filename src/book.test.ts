import {
  addEndgamePosition,
  calcNodeInfo,
  combineNodes,
  getDescendant,
  newEndgameBook,
  newOpeningBook,
  Node,
  removeEndgamePosition,
  splitNode,
} from "./book";

/**
 * Quick way to build a node tree
 *
 * @param nodeSpec like a node, except moves are stored inside the `node` object directly rather
 *    than inside the `children` field.
 */
export function buildNode(nodeSpec: object): Node {
  const currentNode: Node = {
    children: {},
    comment: "",
    annotations: {
      squares: [],
      arrows: [],
    },
    nags: [],
  };

  for (const [key, value] of Object.entries(nodeSpec)) {
    if (key === "comment" || key === "nags") {
      currentNode[key] = value;
    } else if (key == "squares") {
      currentNode.annotations.squares = value;
    } else if (key == "arrows") {
      currentNode.annotations.arrows = value;
    } else {
      currentNode.children[key] = buildNode(value);
    }
  }
  return currentNode;
}

describe("how the position field gets set", () => {
  test("opening book position is set from the initial moves", () => {
    const book = newOpeningBook("e4", "w", ["e4"]);
    expect(book.position).toEqual(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
  });

  test("the endgame book position is set from first position with a placeholder fallback", () => {
    let book = newEndgameBook("Rook endgames");
    expect(book.position).toEqual("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
    book = addEndgamePosition(book, "b", "4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
    expect(book.position).toEqual("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
    book = addEndgamePosition(book, "b", "4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1");
    expect(book.position).toEqual("4k3/7R/8/4PK2/8/8/8/r7 b - - 0 1");
    book = removeEndgamePosition(book, book.positions[0].id);
    expect(book.position).toEqual("4k3/R7/4K3/4P3/8/8/8/4r3 b - - 0 1");
    book = removeEndgamePosition(book, book.positions[0].id);
    expect(book.position).toEqual("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
  });
});

describe("utility functions", () => {
  test("getDescendant", () => {
    const node = buildNode({
      e5: {
        Nf3: {
          Nc6: {
            Bc4: {},
          },
          Nf6: {},
        },
      },
      e6: {},
    });
    expect(getDescendant(node, [])).toEqual(node);
    expect(getDescendant(node, ["e5"])).toEqual(node.children.e5);
    expect(getDescendant(node, ["e5", "Nf3"])).toEqual(
      node.children.e5.children.Nf3,
    );
    expect(getDescendant(node, ["e5", "Nf3", "Nc6"])).toEqual(
      node.children.e5.children.Nf3.children.Nc6,
    );
    expect(getDescendant(node, ["e5", "Nf3", "Nc6", "d4"])).toEqual(null);
  });

  test("calcNodeInfo", () => {
    const node = buildNode({
      e5: {
        Nf3: {
          Nc6: {
            Bc4: {},
          },
          Nf6: {},
        },
      },
      e6: {},
    });
    expect(calcNodeInfo(node)).toEqual({
      lineCount: 3,
      childCount: 2,
      childLineCount: {
        e5: 2,
        e6: 1,
      },
      maxDepth: 4,
    });
    expect(calcNodeInfo(getDescendant(node, ["e5"])!)).toEqual({
      lineCount: 2,
      childCount: 1,
      childLineCount: {
        Nf3: 2,
      },
      maxDepth: 3,
    });
    expect(calcNodeInfo(getDescendant(node, ["e5", "Nf3"])!)).toEqual({
      lineCount: 2,
      childCount: 2,
      childLineCount: {
        Nc6: 1,
        Nf6: 1,
      },
      maxDepth: 2,
    });
    expect(calcNodeInfo(getDescendant(node, ["e5", "Nf3", "Nc6"])!)).toEqual({
      lineCount: 1,
      childCount: 1,
      childLineCount: {
        Bc4: 1,
      },
      maxDepth: 1,
    });
    expect(calcNodeInfo(getDescendant(node, ["e6"])!)).toEqual({
      lineCount: 1,
      childCount: 0,
      childLineCount: {},
      maxDepth: 0,
    });
  });
});

test("splitting and combining nodes", () => {
  const node = buildNode({
    e4: {
      e5: {
        Nf3: {},
      },
      c5: {},
    },
    d4: {},
  });
  const splitNodes = splitNode(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    node,
    "<root>",
  );
  const positionToMoves = Object.fromEntries(
    splitNodes.map((splitNode) => {
      const moves = Object.keys(splitNode.children);
      moves.sort();
      return [splitNode.position, moves];
    }),
  );
  expect(positionToMoves).toEqual({
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": ["d4", "e4"],
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": ["c5", "e5"],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1": ["Nf3"],
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1": [],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 1": [],
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1": [],
  });
  expect(combineNodes(splitNodes, "<root>")).toEqual(node);
});
