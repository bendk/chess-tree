/**
 * Move string (SAN)
 */
export type Move = string;
/**
 * Position string (FEN)
 */
export type Position = string;
/**
 * Color string
 */
export type Color = "w" | "b";
/**
 * A user's book containing trainable move tree(s).
 */
export type Book = OpeningBook | EndgameBook;
/**
 * An opening book
 *
 * This contains a single tree from a single initial position.  The initial position is the result
 * of a known sequence of moves from the start.
 *
 * @field id UUID for the book
 * @field name human-friendly name for the book
 * @field position starting position
 * @field lineCount total number of lines in the book
 * @field initialMoves moves to get to the initial position
 * @field color color the user will train
 * @field rootNode root node of the move tree
 */
export interface OpeningBook {
    type: "opening";
    id: string;
    name: string;
    position: Position;
    lineCount: number;
    initialMoves: Move[];
    color: Color;
    rootNode: Node;
}
/**
 * An endgame book
 *
 * This contains multiple positions and move trees from them.  For example, a user may want a to
 * store an engame book of rook endgames, with a Philador position, lucena position, etc.
 *
 * @field id UUID for the book
 * @field name human-friendly name for the book
 * @field position position to display that represents the book
 * @field lineCount total number of lines in the book
 * @field positions positions to train
 */
export interface EndgameBook {
    type: "endgame";
    id: string;
    name: string;
    position: Position;
    lineCount: number;
    positions: EndgamePosition[];
}
/**
 * A position and a move tree to train
 *
 * @field position starting position
 * @field color the color that the user will be training
 * @field rootNode root node of the move tree
 */
export interface EndgamePosition {
    id: string;
    position: Position;
    color: Color;
    rootNode: Node;
}
/**
 * Book summary data
 *
 * This is good for dispalying a large number of books in a list.  It excludes the
 * `rootNode` / `positions` fields which are large and usually not needed.
 */
export type OpeningBookSummary = Exclude<OpeningBook, "rootNode">;
export type EndgameBookSummary = Exclude<EndgameBook, "positions">;
export type BookSummary = OpeningBookSummary | EndgameBookSummary;
/**
 * Single position in a move tree
 *
 * @field children maps moves to child nodes
 * @field comment comment text
 * @field annotations special markup like %cal and %csl to draw arrows and higlight squares
 * @field nags list of Nag values for the position
 */
export interface Node {
    children: Record<Move, Node>;
    comment: string;
    annotations: Annotations;
    nags: Nag[];
    priority: Priority;
}
/**
 * A move alongside the node that results from it
 */
export type MoveNode = Node & {
    move: Move;
};
/**
 * NAG value (Numeric Annotation Glyph)
 */
export declare enum Nag {
    GoodMove = 1,
    PoorMove = 2,
    BrilliantMove = 3,
    BlunderMove = 4,
    InterestingMove = 5,
    DubiousMove = 6,
    ForcedMove = 7,
    EqualPosition = 10,
    UnclearPosition = 13,
    PlusEqualsPosition = 14,
    EqualsPlusPosition = 15,
    PlusMinusPosition = 16,
    MinusPlusPosition = 17,
    PlusOverMinusPosition = 18,
    MinusOverPlusPosition = 19
}
/**
 * Annotations for a note
 *
 * @field squares %csl squares to higlight squares
 * @field arrows %cal squares draw arrows
 */
export interface Annotations {
    squares: string[];
    arrows: string[];
}
export declare const MOVE_NAGS: Nag[];
export declare const POSITION_NAGS: Nag[];
/**
 * Get a text string for a NAG
 */
export declare function nagText(nag: Nag): string;
/**
 * Move priority values
 */
export declare enum Priority {
    Default = 0,
    TrainFirst = 1,
    TrainLast = -1
}
/**
 * Create a new opening book
 */
export declare function newOpeningBook(name: string, color: Color, initialMoves: Move[]): OpeningBook;
/**
 * Create a new endgame book
 */
export declare function newEndgameBook(name: string): EndgameBook;
/**
 * create a new endgame position
 */
export declare function newEndgamePosition(position: string, color: "w" | "b"): EndgamePosition;
/**
 * Add a position to an endgame book
 */
export declare function addEndgamePosition(book: EndgameBook, color: Color, position: Position): EndgameBook;
/**
 * Remove a position from an endgame book
 */
export declare function removeEndgamePosition(book: EndgameBook, positionId: string): EndgameBook;
export declare function newNode(): Node;
/**
 * Get the number of moves / child nodes for a node
 */
export declare function childCount(node: Node): number;
/**
 * Get a decendent node
 */
export declare function getDescendant(node: Node, moves: Move[]): Node | null;
/**
 * Get the path to a decendent node
 *
 * This returns an array of all nodes up to the descendant
 *
 */
export declare function getNodePath(node: Node, moves: Move[]): Node[] | null;
/**
 * Calculate information about a node
 *
 */
export declare function calcNodeInfo(node: Node): NodeInfo;
/**
 * Result of a getNodeInfo() call
 *
 * @field lineCount: number of distinct lines in the node
 * @field childCount: number of moves / child nodes
 * @field childLineCount: maps moves to the total lines for each child
 * @field maxDepth: maximum ply depth over all children
 */
export interface NodeInfo {
    lineCount: number;
    childCount: number;
    childLineCount: Record<Move, number>;
    maxDepth: number;
}
/**
 * Create a new node by updating one of the child nodes
 *
 * This is useful for reducers since it doesn't mutate any of the existing nodes.
 */
export declare function updateChild(node: Node, moves: Move[], operation: (node: Node) => Node): Node;
/**
 * Create a new node by updating all decendents of a node
 *
 * This is useful for reducers since it doesn't mutate any of the existing nodes.
 */
export declare function updateAllDescendents(node: Node, moves: Move[], operation: (node: Node) => Node): Node;
/**
 * Create a new node by updating all ancestors, until the first ancestor with multiple children
 *
 * This is useful for reducers since it doesn't mutate any of the existing nodes.
 */
export declare function updateToStartOfBranch(node: Node, moves: Move[], operation: (node: Node) => Node): Node;
/**
 * Find the start of the last branch before a series of moves
 *
 * This is the last move that was the only one child.
 */
export declare function findStartOfBranch(node: Node, moves: Move[]): Move[];
/**
 * Node where children are not nested inline
 *
 * Each node gets an UUID and children are specified by mapping the moves to UUID values.
 * This can be used to store the each node in a separate row.
 *
 * Also, split nodes have a normalized FEN field.  This is the normal FEN value with:
 *   - The en passant square set to '-' if there is no possible en passant possible.
 *   - The halfmove clock set to 0
 *   - The fullmove number set to 1.
 *
 * This allows consumers lookup moves by position.  Each node can be stored in a separate database
 * row and those rows can be indexed with the normalized FEN.
 */
export interface SplitNode extends Omit<Node, "children"> {
    nodeId: string;
    position: Position;
    children: Record<Move, string>;
}
/**
 * Convert a `Node` into a list of `SplitNodes`
 */
export declare function splitNode(initialPosition: Position, node: Node, rootNodeId: string): SplitNode[];
/**
 * Convert a list of `SplitNodes` back into a `Node`
 */
export declare function combineNodes(splitNodes: SplitNode[], rootNodeId: string): Node;
