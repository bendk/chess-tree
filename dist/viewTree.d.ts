import { Annotations, Move, MoveNode, Nag, Node } from "./book";
/**
 * Generate a view of a node tree
 *
 * A view node tree is like a node tree, except some nodes may be truncated to avoid showing the
 * user too much at once.
 */
export declare function viewNodeTree(params: ViewNodeTreeParams): ViewNodeTreeResult;
/**
 * Node returned from viewNodeTree.
 *
 * This is like MoveNode with some exceptions:
 *    - Truncated nodes do not have a `children` field.
 *    - View nodes have a `depth` field which indicates the number of moves in their deepest branch
 *    - View nodes have a `lineCount` field, which is the result of `lineCount(node)`.
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
