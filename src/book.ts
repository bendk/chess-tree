import { v4 as uuidv4 } from "uuid";
import { makeMove } from "./chessLogic";

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
 * FEN for the initial position
 */
const INITIAL_POSITION =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * FEN for a generic endgame position
 */
const GENERIC_ENDGAME = "8/8/4k3/8/8/4K3/8/8 w - - 0 1";

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
export type MoveNode = Node & { move: Move };

/**
 * NAG value (Numeric Annotation Glyph)
 */
export enum Nag {
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
    MinusOverPlusPosition = 19,
    // Specialized Nags for chess-tree, according to Wikipedia all values in the range [222-237] are
    // unused by other software
    PriorityTrainFirst = 222,
    PriorityTrainLast = 223,
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

export const MOVE_NAGS = [
    Nag.GoodMove,
    Nag.PoorMove,
    Nag.BrilliantMove,
    Nag.BlunderMove,
    Nag.InterestingMove,
    Nag.DubiousMove,
    Nag.ForcedMove,
];

export const POSITION_NAGS = [
    Nag.EqualPosition,
    Nag.UnclearPosition,
    Nag.PlusEqualsPosition,
    Nag.EqualsPlusPosition,
    Nag.PlusMinusPosition,
    Nag.MinusPlusPosition,
    Nag.PlusOverMinusPosition,
    Nag.MinusOverPlusPosition,
];

const nagTextMap = new Map<Nag, string>();
nagTextMap.set(Nag.BrilliantMove, "!!");
nagTextMap.set(Nag.GoodMove, "!");
nagTextMap.set(Nag.InterestingMove, "!?");
nagTextMap.set(Nag.DubiousMove, "?!");
nagTextMap.set(Nag.PoorMove, "?");
nagTextMap.set(Nag.BlunderMove, "??");
nagTextMap.set(Nag.PlusMinusPosition, "+-");
nagTextMap.set(Nag.PlusEqualsPosition, "+");
nagTextMap.set(Nag.EqualPosition, "=");
nagTextMap.set(Nag.UnclearPosition, "\u221E");
nagTextMap.set(Nag.EqualsPlusPosition, "=+");
nagTextMap.set(Nag.MinusPlusPosition, "-+");

/**
 * Get a text string for a NAG
 */
export function nagText(nag: Nag): string {
    return nagTextMap.get(nag) ?? "<?>";
}

/**
 * Move priority values
 */
export enum Priority {
    Default = 0,
    TrainFirst = 1,
    TrainLast = -1,
}

/**
 * Create a new opening book
 */
export function newOpeningBook(
    name: string,
    color: Color,
    initialMoves: Move[],
): OpeningBook {
    let position = INITIAL_POSITION;
    for (const move of initialMoves) {
        const newPosition = makeMove(position, move);
        if (newPosition == null) {
            throw Error(`Invalid initial moves: ${initialMoves}`);
        } else {
            position = newPosition;
        }
    }
    return {
        type: "opening",
        id: uuidv4(),
        name,
        position,
        lineCount: 0,
        color,
        initialMoves,
        rootNode: newNode(),
    };
}

/**
 * Create a new endgame book
 */
export function newEndgameBook(name: string): EndgameBook {
    return {
        type: "endgame",
        id: uuidv4(),
        name,
        lineCount: 0,
        position: GENERIC_ENDGAME,
        positions: [],
    };
}

/**
 * create a new endgame position
 */
export function newEndgamePosition(
    position: string,
    color: "w" | "b",
): EndgamePosition {
    return { id: uuidv4(), position, color, rootNode: newNode() };
}

/**
 * Add a position to an endgame book
 */
export function addEndgamePosition(
    book: EndgameBook,
    color: Color,
    position: Position,
): EndgameBook {
    return updatePositions(book, (positions) => [
        ...positions,
        {
            id: uuidv4(),
            position,
            color,
            rootNode: newNode(),
        },
    ]);
}

/**
 * Remove a position from an endgame book
 */
export function removeEndgamePosition(
    book: EndgameBook,
    positionId: string,
): EndgameBook {
    return updatePositions(book, (positions) =>
        positions.filter((p) => p.id != positionId),
    );
}

function updatePositions(
    book: EndgameBook,
    operation: (positions: EndgamePosition[]) => EndgamePosition[],
): EndgameBook {
    const positions = operation(book.positions);
    const position = positions[0]?.position ?? GENERIC_ENDGAME;
    return { ...book, positions, position };
}

export function newNode(): Node {
    return {
        children: {},
        comment: "",
        annotations: {
            squares: [],
            arrows: [],
        },
        nags: [],
        priority: Priority.Default,
    };
}

/**
 * Get the number of moves / child nodes for a node
 */
export function childCount(node: Node): number {
    return Object.keys(node.children).length;
}

/**
 * Get a decendent node
 */
export function getDescendant(node: Node, moves: Move[]): Node | null {
    for (const move of moves) {
        if (node.children[move] === undefined) {
            return null;
        }
        node = node.children[move];
    }
    return node;
}

/**
 * Get the path to a decendent node
 *
 * This returns an array of all nodes up to the descendant
 *
 */
export function getNodePath(node: Node, moves: Move[]): Node[] | null {
    const path = [node];
    for (const move of moves) {
        if (node.children[move] === undefined) {
            return null;
        }
        node = node.children[move];
        path.push(node);
    }
    return path;
}

/**
 * Calculate information about a node
 *
 */
export function calcNodeInfo(node: Node): NodeInfo {
    if (childCount(node) == 0) {
        return {
            lineCount: 1,
            childCount: 0,
            childLineCount: {},
            maxDepth: 0,
        };
    }
    const info: NodeInfo = {
        lineCount: 0,
        childCount: 0,
        childLineCount: {},
        maxDepth: 0,
    };
    for (const [move, child] of Object.entries(node.children)) {
        const childInfo = calcNodeInfo(child);
        info.lineCount += childInfo.lineCount;
        info.childLineCount[move] = childInfo.lineCount;
        info.maxDepth = Math.max(info.maxDepth, childInfo.maxDepth + 1);
        info.childCount += 1;
    }
    return info;
}

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
export function updateChild(
    node: Node,
    moves: Move[],
    operation: (node: Node) => Node,
): Node {
    const [move, ...rest] = moves;
    if (move === undefined) {
        return operation(node);
    } else {
        const childNode = node.children[move];
        if (childNode === undefined) {
            return node;
        }
        return {
            ...node,
            children: {
                ...node.children,
                [move]: updateChild(childNode, rest, operation),
            },
        };
    }
}

/**
 * Create a new node by updating all decendents of a node
 *
 * This is useful for reducers since it doesn't mutate any of the existing nodes.
 */
export function updateAllDescendents(
    node: Node,
    moves: Move[],
    operation: (node: Node) => Node,
): Node {
    const [move, ...rest] = moves;
    if (move === undefined) {
        return {
            ...operation(node),
            children: Object.fromEntries(
                Object.entries(node.children).map(([move, childNode]) => [
                    move,
                    updateAllDescendents(childNode, [], operation),
                ]),
            ),
        };
    } else {
        const childNode = node.children[move];
        if (childNode === undefined) {
            return node;
        }
        return {
            ...node,
            children: {
                ...node.children,
                [move]: updateAllDescendents(childNode, rest, operation),
            },
        };
    }
}

/**
 * Create a new node by updating all ancestors, until the first ancestor with multiple children
 *
 * This is useful for reducers since it doesn't mutate any of the existing nodes.
 */
export function updateToStartOfBranch(
    node: Node,
    moves: Move[],
    operation: (node: Node) => Node,
): Node {
    const movesToStart = findStartOfBranch(node, moves);
    for (let i = movesToStart.length; i < moves.length + 1; i++) {
        node = updateChild(node, moves.slice(0, i), operation);
    }
    return node;
}

/**
 * Find the start of the last branch before a series of moves
 *
 * This is the last move that was the only one child.
 */
export function findStartOfBranch(node: Node, moves: Move[]): Move[] {
    let lastNodeHadOneChild = false;
    let lastBranchIndex = 0;
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        node = node.children[move];
        if (node === undefined) {
            break;
        }
        if (!lastNodeHadOneChild && childCount(node) == 1) {
            // Add 1 to avoid an off-by-one-error when we call slice
            lastBranchIndex = i + 1;
        }
        lastNodeHadOneChild = childCount(node) == 1;
    }
    return moves.slice(0, lastBranchIndex);
}

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
export function splitNode(
    initialPosition: Position,
    node: Node,
    rootNodeId: string,
): SplitNode[] {
    const splitNodes: SplitNode[] = [];
    function visit(position: Position, currentNode: Node): string {
        const splitNode: SplitNode = {
            ...currentNode,
            nodeId: currentNode === node ? rootNodeId : uuidv4(),
            position: normalizeFen(position),
            children: Object.fromEntries(
                Object.entries(currentNode.children).map(
                    ([move, childNode]) => [
                        move,
                        visit(makeMove(position, move), childNode),
                    ],
                ),
            ),
        };
        splitNodes.push(splitNode);
        return splitNode.nodeId;
    }
    visit(initialPosition, node);
    return splitNodes;
}

/**
 * Convert a list of `SplitNodes` back into a `Node`
 */
export function combineNodes(
    splitNodes: SplitNode[],
    rootNodeId: string,
): Node {
    const nodeMap = Object.fromEntries(
        splitNodes.map((node) => [node.nodeId, node]),
    );
    function makeNode(nodeId: string): Node {
        const splitNode = nodeMap[nodeId];
        if (splitNode === undefined) {
            throw Error(`combineNodes: missing node: ${nodeId}`);
        }
        const {
            position: _position,
            nodeId: _nodeId,
            ...splitNodeWithoutExtraFields
        } = splitNode;
        return {
            ...splitNodeWithoutExtraFields,
            children: Object.fromEntries(
                Object.entries(splitNode.children).map(([move, nodeId]) => [
                    move,
                    makeNode(nodeId),
                ]),
            ),
        };
    }
    return makeNode(rootNodeId);
}

const normalizeFen = (position: Position) => position.slice(0, -3) + "0 1";
