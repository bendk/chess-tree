import { Annotations, Move, MoveNode, Nag, Node, childCount } from "./book";

/**
 * Generate a view of a node tree
 *
 * A view node tree is like a node tree, except some nodes may be truncated to avoid showing the
 * user too much at once.
 */
export function viewNodeTree(params: ViewNodeTreeParams): ViewNodeTreeResult {
  return doViewNodeTree(params);
}

/**
 * Node returned from viewNodeTree.
 *
 * This is like MoveNode with some exceptions:
 *    - Truncated nodes do not have a `children` field.
 *    - View nodes have a `depth` field which indicates the number of moves in their deepest branch
 *    - View nodes have a `lineCount` field, which is the result of `calcNodeInfo(node).lineCount`.
 *    - View nodes have a `branchCount` field.  This indicates the total number of branches in the
 *      node tree.  If descendent nodes are truncated then `branchCount < lineCount`.
 */
export type ViewNode = Omit<MoveNode, "children"> & {
  children?: Record<string, ViewNode>;
  maxDepth: number;
  lineCount: number;
  branchCount: number;
};

/**
 * Params for the viewNodeTree function
 *
 * @field rootNode: root node for the book / position
 * @field moves: moves to get from the root node to the current position.  This indicates where we
 *   should focus if the tree gets truncated.
 * @field maxBranches: maximum number of branches to return.
 * @field maxDepth: maximum number of depth for the lines.
 */
export type ViewNodeTreeParams = {
  rootNode: Node;
  moves: Move[];
  maxBranches: number;
  maxDepth: number;
};

/**
 * Result of the viewNodeTree function
 *
 * This will return the first a that fits within the specified limits.
 *
 * First it tries to find an ancestor of the current position that fits within the speficied limits,
 * starting from the root of the tree down to the current position itself.
 *
 * Then it looks at trees starting with the current position, but truncating nodes after a
 * specific depth.  The highest depth that fits within the limits will be used.
 *
 * Finally, as a fallback it returns a tree with the current position expanded and all other nodes
 * truncated.
 */
export type ViewNodeTreeResult = {
  leadingMoves: Move[];
  childNodes: ViewNode[];
  comment: string;
  annotations: Annotations;
  nags: Nag[];
};

function doViewNodeTree(params: ViewNodeTreeParams): ViewNodeTreeResult {
  // Create a fully-expanded node tree
  let result: ViewNodeTreeResult = {
    leadingMoves: [],
    childNodes: Object.entries(params.rootNode.children).map(([move, child]) =>
      makeViewNodeTree(move, child),
    ),
    comment: params.rootNode.comment,
    annotations: params.rootNode.annotations,
    nags: params.rootNode.nags,
  };
  // Walk from the root node to the current node.  If there is a valid view node tree to return,
  // return that.
  if (resultFitsLimits(result, params)) {
    return result;
  }
  for (const move of params.moves) {
    const child = result.childNodes.find((child) => child.move === move);
    if (child === undefined) {
      throw Error(`Child not found (moves: ${params.moves}, move: ${move})`);
    }
    result = {
      leadingMoves: [...result.leadingMoves, move],
      childNodes: Object.values(child.children),
      comment: child.comment,
      annotations: child.annotations,
      nags: child.nags,
    };
    if (resultFitsLimits(result, params)) {
      return result;
    }
  }

  // We're going to need to truncate some of the children of the current node.
  // Lower the depth 1 at a time until we find a tree that fits the limits
  const expandedChildNodes = result.childNodes;
  for (let depth = params.maxDepth - 1; depth > 0; depth--) {
    result = {
      ...result,
      leadingMoves: result.leadingMoves,
      childNodes: expandedChildNodes.map((node) =>
        truncateChildren(node, depth),
      ),
    };
    if (resultFitsLimits(result, params)) {
      return result;
    }
  }
  // None of those depths work, as a fallback, pick depth=0 (this still may overflow the line
  // limit, but it's the best we can do).
  return {
    ...result,
    leadingMoves: result.leadingMoves,
    childNodes: expandedChildNodes.map((node) => truncateChildren(node, 0)),
  };
}

/**
 * Does the work to convert a node tree to a (fully-expanded) view node tree
 */
function makeViewNodeTree(move: Move, node: Node): ViewNode {
  const children: Record<Move, ViewNode> = {};
  let lineCount = 0;
  let maxDepth = 0;

  if (childCount(node) === 0) {
    lineCount = 1;
  } else {
    for (const [childMove, child] of Object.entries(node.children)) {
      const viewNode = makeViewNodeTree(childMove, child);
      children[childMove] = viewNode;
      lineCount += viewNode.lineCount;
      maxDepth = Math.max(maxDepth, viewNode.maxDepth + 1);
    }
  }

  return {
    ...node,
    move,
    children,
    lineCount,
    maxDepth,
    branchCount: lineCount,
  };
}

function resultFitsLimits(
  result: ViewNodeTreeResult,
  params: ViewNodeTreeParams,
): boolean {
  const branchCount = result.childNodes.reduce(
    (partial, node) => partial + node.branchCount,
    0,
  );
  const maxChildDepth = Math.max(
    ...result.childNodes.map((node) => node.maxDepth),
  );
  return (
    branchCount <= params.maxBranches && maxChildDepth + 1 <= params.maxDepth
  );
}

function truncateChildren(node: ViewNode, depthLeft: number): ViewNode {
  if (depthLeft <= 0) {
    return {
      ...node,
      children: undefined,
      branchCount: 1,
      maxDepth: 0,
    };
  } else {
    let branchCount = 0;
    let maxDepth = 0;
    const childrenEntries = Object.entries(node.children);
    const children: Record<Move, ViewNode> = {};

    if (childrenEntries.length === 0) {
      branchCount = 1;
    } else {
      for (const [move, child] of childrenEntries) {
        const newChild = truncateChildren(child, depthLeft - 1);
        children[move] = newChild;
        branchCount += newChild.branchCount;
        maxDepth = Math.max(maxDepth, newChild.maxDepth + 1);
      }
    }

    return {
      ...node,
      children,
      branchCount,
      maxDepth,
    };
  }
}
