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
 * Update an opening book
 */
export function updateOpening(book: OpeningBook, rootNode: Node): OpeningBook {
    return { ...book, rootNode, lineCount: lineCount(rootNode) };
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
    position: EndgamePosition,
): EndgameBook {
    return {
        ...book,
        positions: [...book.positions, position],
        position:
            book.positions.length == 0 ? position.position : book.position,
    };
}

/**
 * Update a position from an endgame book
 */
export function updateEndgamePosition(
    book: EndgameBook,
    positionId: string,
    rootNode: Node,
): EndgameBook {
    let newLineCount = book.lineCount;
    const newPositions = book.positions.map((position) => {
        if (position.id == positionId) {
            newLineCount += lineCount(rootNode) - lineCount(position.rootNode);
            return { ...position, rootNode };
        } else {
            return position;
        }
    });
    return {
        ...book,
        positions: newPositions,
        lineCount: newLineCount,
    };
}

/**
 * Remove a position from an endgame book
 */
export function removeEndgamePosition(
    book: EndgameBook,
    positionId: string,
): EndgameBook {
    let newLineCount = book.lineCount;
    const newPositions = book.positions.filter((position) => {
        if (position.id === positionId) {
            newLineCount -= lineCount(position.rootNode);
            return false;
        } else {
            return true;
        }
    });
    return {
        ...book,
        position: newPositions[0]?.position ?? GENERIC_ENDGAME,
        positions: newPositions,
        lineCount: newLineCount,
    };
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
 * If there is exactly 1 child node, return it
 */
export function getSingleChild(node: Node): Node | null {
    const children = Object.values(node.children);
    return children.length == 1 ? children[0] : null;
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
 * Convert a list of opening moves to be relative to the initialMoves of an opening
 */
function movesRelativeToOpeningBook(
    source: OpeningBook,
    moves: Move[],
): Move[] | null {
    if (!movesStartWith(moves, source.initialMoves)) {
        return null;
    }
    return moves.slice(source.initialMoves.length);
}

/**
 * Get the total number of lines for a node
 */
export function lineCount(node: Node): number {
    let count = 0;
    for (const [_, child] of Object.entries(node.children)) {
        if (childCount(child) == 0) {
            count += 1;
        } else {
            count += lineCount(child);
        }
    }
    return count;
}

/**
 * Get the total number of lines for a node
 */
export function lineCountByPriority(node: Node): LineCountByPriority {
    if (childCount(node) == 0) {
        if (node.priority === Priority.TrainFirst) {
            return {
                default: 0,
                trainFirst: 1,
                trainLast: 0,
            };
        } else if (node.priority == Priority.TrainLast) {
            return {
                default: 0,
                trainFirst: 0,
                trainLast: 1,
            };
        } else {
            return {
                default: 1,
                trainFirst: 0,
                trainLast: 0,
            };
        }
    }
    const result: LineCountByPriority = {
        default: 0,
        trainFirst: 0,
        trainLast: 0,
    };
    for (const [_, child] of Object.entries(node.children)) {
        const childResult = lineCountByPriority(child);
        result.default += childResult.default;
        result.trainFirst += childResult.trainFirst;
        result.trainLast += childResult.trainLast;
    }
    return result;
}

export interface LineCountByPriority {
    default: number;
    trainFirst: number;
    trainLast: number;
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
 * Add a new line to a node
 */
export function addLine(node: Node, moves: Move[]): Node {
    const [cursor, clonedNode] = NodeCursor.init(node);
    for (const move of moves) {
        cursor.moveOrInsert(move);
    }
    return clonedNode;
}

/**
 * Move a line from one opening book to another
 */
export function moveLine(
    source: OpeningBook,
    destination: OpeningBook,
    moves: Move[],
): [OpeningBook, OpeningBook] {
    // Create 2 cursors: one for the source book and one for the destination book
    const [sourceCursor, sourceNewRoot] = NodeCursor.init(source.rootNode);
    const [destCursor, destNewRoot] = NodeCursor.init(destination.rootNode);
    // Position both cursors at the start of the line
    const sourceMoves = movesRelativeToOpeningBook(source, moves);
    if (sourceMoves === null) {
        throw Error(`${source.name} initial moves do not start with: ${moves}`);
    }
    const destMoves = movesRelativeToOpeningBook(destination, moves);
    if (destMoves === null) {
        throw Error(
            `${destination.name} initial moves do not start with: ${moves}`,
        );
    }
    if (!sourceCursor.bulkMove(sourceMoves)) {
        throw Error(`Line not present in ${source.name}: ${moves}`);
    }
    for (const move of destMoves) {
        destCursor.moveOrInsert(move);
    }
    // Move all nodes from source to destination
    moveAll(sourceCursor, destCursor);
    // Delete the parent move from source (if there is one)
    const lastSourceMove = sourceMoves.at(-1);
    if (lastSourceMove) {
        sourceCursor.moveToParent();
        delete sourceCursor.current.children[lastSourceMove];
    }
    return [
        {
            ...source,
            rootNode: sourceNewRoot,
            lineCount: lineCount(sourceNewRoot),
        },
        {
            ...destination,
            rootNode: destNewRoot,
            lineCount: lineCount(destNewRoot),
        },
    ];
}

function moveAll(source: NodeCursor, dest: NodeCursor) {
    for (const move in source.current.children) {
        const sourceClone = source.clone();
        const destClone = dest.clone();
        sourceClone.move(move);
        destClone.moveOrInsert(move);
        moveAll(sourceClone, destClone);
    }
    source.current.children = {};
}

function movesStartWith(moves: Move[], startWith: Move[]): boolean {
    if (startWith.length > moves.length) {
        return false;
    }
    for (let i = 0; i < startWith.length; i++) {
        if (moves[i] !== startWith[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Cursor supports moving through a Node and performing COW updates.
 *
 * This is a convient and efficient way to generate an updated node without mutating the original.
 */
export class NodeCursor {
    /**
     * Node we're currently operating on.  This is a copy of the node from the source node and
     * can be mutated without mutating the source.
     */
    current: Node;
    parent: NodeCursor | null;

    /**
     * "Private" constructor, consumers should use init to create a NodeCursor
     */
    constructor(node: Node, parent: NodeCursor | null) {
        this.current = node;
        this.parent = parent;
    }

    /**
     * Get a new NodeCursor and the node that it will be updating
     */
    static init(source: Node): [NodeCursor, Node] {
        // Create a copy of source for the cursor.
        const copy = this.cloneNode(source);
        return [new NodeCursor(copy, null), copy];
    }

    private static cloneNode(node: Node): Node {
        return {
            ...node,
            children: { ...node.children },
            annotations: { ...node.annotations },
            nags: [...node.nags],
        };
    }

    /**
     * Move to a child node, updating the cursor
     *
     * Returns true on success, false if the move doesn't exist in the current node
     */
    move(move: Move): boolean {
        const child = this.current.children[move];
        if (child === undefined) {
            return false;
        }
        this.moveToChild(move, NodeCursor.cloneNode(child));
        return true;
    }

    /**
     * Move to a child node, creating a new one if the move doesn't currently exist
     *
     * Returns true if it inserted a move
     */
    moveOrInsert(move: Move): boolean {
        const child = this.current.children[move];
        if (child === undefined) {
            this.moveToChild(move, {
                ...newNode(),
                priority: this.current.priority,
            });
            return true;
        } else {
            this.moveToChild(move, NodeCursor.cloneNode(child));
            return false;
        }
    }

    /**
     * Get a list of cursors for all child nodes
     */
    childCursors(): NodeCursor[] {
        const children = [];
        for (const move in this.current.children) {
            const cloned = this.clone();
            cloned.move(move);
            children.push(cloned);
        }
        return children;
    }

    /**
     * Move to the parent node
     */
    parentNode(): Node | undefined {
        return this.parent?.current;
    }

    /**
     * Move to the parent node
     */
    moveToParent(): boolean {
        if (this.parent === null) {
            return false;
        }
        this.current = this.parent.current;
        this.parent = this.parent.parent;
        return true;
    }

    private moveToChild(move: Move, child: Node) {
        this.current.children[move] = child;
        this.parent = { ...this };
        this.current = child;
    }

    /**
     * Try to remove a child node
     */
    removeChild(move: Move): Node | null {
        const child = this.current.children[move] ?? null;
        delete this.current.children[move];
        return child;
    }

    /**
     * Move to a descendant node, updating the cursor
     *
     * This tries to make all moves in moves.  On failure, it will return false and the cursor will
     * be on the last node that existed.
     */
    bulkMove(moves: Move[]): boolean {
        for (const move of moves) {
            if (!this.move(move)) {
                return false;
            }
        }
        return true;
    }

    clone(): NodeCursor {
        return new NodeCursor(this.current, this.parent);
    }
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
