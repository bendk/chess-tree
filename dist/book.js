"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineNodes = exports.splitNode = exports.NodeCursor = exports.moveLine = exports.addLine = exports.lineCountByPriority = exports.lineCount = exports.getNodePath = exports.getDescendant = exports.getSingleChild = exports.childCount = exports.newNode = exports.removeEndgamePosition = exports.updateEndgamePosition = exports.addEndgamePosition = exports.newEndgamePosition = exports.newEndgameBook = exports.updateOpening = exports.newOpeningBook = exports.Priority = exports.nagText = exports.POSITION_NAGS = exports.MOVE_NAGS = exports.Nag = void 0;
const uuid_1 = require("uuid");
const chessLogic_1 = require("./chessLogic");
/**
 * FEN for the initial position
 */
const INITIAL_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/**
 * FEN for a generic endgame position
 */
const GENERIC_ENDGAME = "8/8/4k3/8/8/4K3/8/8 w - - 0 1";
/**
 * NAG value (Numeric Annotation Glyph)
 */
var Nag;
(function (Nag) {
    Nag[Nag["GoodMove"] = 1] = "GoodMove";
    Nag[Nag["PoorMove"] = 2] = "PoorMove";
    Nag[Nag["BrilliantMove"] = 3] = "BrilliantMove";
    Nag[Nag["BlunderMove"] = 4] = "BlunderMove";
    Nag[Nag["InterestingMove"] = 5] = "InterestingMove";
    Nag[Nag["DubiousMove"] = 6] = "DubiousMove";
    Nag[Nag["ForcedMove"] = 7] = "ForcedMove";
    Nag[Nag["EqualPosition"] = 10] = "EqualPosition";
    Nag[Nag["UnclearPosition"] = 13] = "UnclearPosition";
    Nag[Nag["PlusEqualsPosition"] = 14] = "PlusEqualsPosition";
    Nag[Nag["EqualsPlusPosition"] = 15] = "EqualsPlusPosition";
    Nag[Nag["PlusMinusPosition"] = 16] = "PlusMinusPosition";
    Nag[Nag["MinusPlusPosition"] = 17] = "MinusPlusPosition";
    Nag[Nag["PlusOverMinusPosition"] = 18] = "PlusOverMinusPosition";
    Nag[Nag["MinusOverPlusPosition"] = 19] = "MinusOverPlusPosition";
    // Specialized Nags for chess-tree, according to Wikipedia all values in the range [222-237] are
    // unused by other software
    Nag[Nag["PriorityTrainFirst"] = 222] = "PriorityTrainFirst";
    Nag[Nag["PriorityTrainLast"] = 223] = "PriorityTrainLast";
})(Nag || (exports.Nag = Nag = {}));
exports.MOVE_NAGS = [
    Nag.GoodMove,
    Nag.PoorMove,
    Nag.BrilliantMove,
    Nag.BlunderMove,
    Nag.InterestingMove,
    Nag.DubiousMove,
    Nag.ForcedMove,
];
exports.POSITION_NAGS = [
    Nag.EqualPosition,
    Nag.UnclearPosition,
    Nag.PlusEqualsPosition,
    Nag.EqualsPlusPosition,
    Nag.PlusMinusPosition,
    Nag.MinusPlusPosition,
    Nag.PlusOverMinusPosition,
    Nag.MinusOverPlusPosition,
];
const nagTextMap = new Map();
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
function nagText(nag) {
    var _a;
    return (_a = nagTextMap.get(nag)) !== null && _a !== void 0 ? _a : "<?>";
}
exports.nagText = nagText;
/**
 * Move priority values
 */
var Priority;
(function (Priority) {
    Priority[Priority["Default"] = 0] = "Default";
    Priority[Priority["TrainFirst"] = 1] = "TrainFirst";
    Priority[Priority["TrainLast"] = -1] = "TrainLast";
})(Priority || (exports.Priority = Priority = {}));
/**
 * Create a new opening book
 */
function newOpeningBook(name, color, initialMoves) {
    let position = INITIAL_POSITION;
    for (const move of initialMoves) {
        const newPosition = (0, chessLogic_1.makeMove)(position, move);
        if (newPosition == null) {
            throw Error(`Invalid initial moves: ${initialMoves}`);
        }
        else {
            position = newPosition;
        }
    }
    return {
        type: "opening",
        id: (0, uuid_1.v4)(),
        name,
        position,
        lineCount: 0,
        color,
        initialMoves,
        rootNode: newNode(),
    };
}
exports.newOpeningBook = newOpeningBook;
/**
 * Update an opening book
 */
function updateOpening(book, rootNode) {
    return { ...book, rootNode, lineCount: lineCount(rootNode) };
}
exports.updateOpening = updateOpening;
/**
 * Create a new endgame book
 */
function newEndgameBook(name) {
    return {
        type: "endgame",
        id: (0, uuid_1.v4)(),
        name,
        lineCount: 0,
        position: GENERIC_ENDGAME,
        positions: [],
    };
}
exports.newEndgameBook = newEndgameBook;
/**
 * create a new endgame position
 */
function newEndgamePosition(position, color) {
    return { id: (0, uuid_1.v4)(), position, color, rootNode: newNode() };
}
exports.newEndgamePosition = newEndgamePosition;
/**
 * Add a position to an endgame book
 */
function addEndgamePosition(book, position) {
    return {
        ...book,
        positions: [...book.positions, position],
        position: book.positions.length == 0 ? position.position : book.position,
    };
}
exports.addEndgamePosition = addEndgamePosition;
/**
 * Update a position from an endgame book
 */
function updateEndgamePosition(book, positionId, rootNode) {
    let newLineCount = book.lineCount;
    const newPositions = book.positions.map((position) => {
        if (position.id == positionId) {
            newLineCount += lineCount(rootNode) - lineCount(position.rootNode);
            return { ...position, rootNode };
        }
        else {
            return position;
        }
    });
    return {
        ...book,
        positions: newPositions,
        lineCount: newLineCount,
    };
}
exports.updateEndgamePosition = updateEndgamePosition;
/**
 * Remove a position from an endgame book
 */
function removeEndgamePosition(book, positionId) {
    var _a, _b;
    let newLineCount = book.lineCount;
    const newPositions = book.positions.filter((position) => {
        if (position.id === positionId) {
            newLineCount -= lineCount(position.rootNode);
            return false;
        }
        else {
            return true;
        }
    });
    return {
        ...book,
        position: (_b = (_a = newPositions[0]) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : GENERIC_ENDGAME,
        positions: newPositions,
        lineCount: newLineCount,
    };
}
exports.removeEndgamePosition = removeEndgamePosition;
function newNode() {
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
exports.newNode = newNode;
/**
 * Get the number of moves / child nodes for a node
 */
function childCount(node) {
    return Object.keys(node.children).length;
}
exports.childCount = childCount;
/**
 * If there is exactly 1 child node, return it
 */
function getSingleChild(node) {
    const children = Object.values(node.children);
    return children.length == 1 ? children[0] : null;
}
exports.getSingleChild = getSingleChild;
/**
 * Get a decendent node
 */
function getDescendant(node, moves) {
    for (const move of moves) {
        if (node.children[move] === undefined) {
            return null;
        }
        node = node.children[move];
    }
    return node;
}
exports.getDescendant = getDescendant;
/**
 * Get the path to a decendent node
 *
 * This returns an array of all nodes up to the descendant
 *
 */
function getNodePath(node, moves) {
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
exports.getNodePath = getNodePath;
/**
 * Convert a list of opening moves to be relative to the initialMoves of an opening
 */
function movesRelativeToOpeningBook(source, moves) {
    if (!movesStartWith(moves, source.initialMoves)) {
        return null;
    }
    return moves.slice(source.initialMoves.length);
}
/**
 * Get the total number of lines for a node
 */
function lineCount(node) {
    let count = 0;
    for (const [_, child] of Object.entries(node.children)) {
        if (childCount(child) == 0) {
            count += 1;
        }
        else {
            count += lineCount(child);
        }
    }
    return count;
}
exports.lineCount = lineCount;
/**
 * Get the total number of lines for a node
 */
function lineCountByPriority(node) {
    if (childCount(node) == 0) {
        if (node.priority === Priority.TrainFirst) {
            return {
                default: 0,
                trainFirst: 1,
                trainLast: 0,
            };
        }
        else if (node.priority == Priority.TrainLast) {
            return {
                default: 0,
                trainFirst: 0,
                trainLast: 1,
            };
        }
        else {
            return {
                default: 1,
                trainFirst: 0,
                trainLast: 0,
            };
        }
    }
    const result = {
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
exports.lineCountByPriority = lineCountByPriority;
/**
 * Add a new line to a node
 */
function addLine(node, moves) {
    const [cursor, clonedNode] = NodeCursor.init(node);
    for (const move of moves) {
        cursor.moveOrInsert(move);
    }
    return clonedNode;
}
exports.addLine = addLine;
/**
 * Move a line from one opening book to another
 */
function moveLine(source, destination, moves) {
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
        throw Error(`${destination.name} initial moves do not start with: ${moves}`);
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
exports.moveLine = moveLine;
function moveAll(source, dest) {
    for (const move in source.current.children) {
        const sourceClone = source.clone();
        const destClone = dest.clone();
        sourceClone.move(move);
        destClone.moveOrInsert(move);
        moveAll(sourceClone, destClone);
    }
    source.current.children = {};
}
function movesStartWith(moves, startWith) {
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
class NodeCursor {
    /**
     * "Private" constructor, consumers should use init to create a NodeCursor
     */
    constructor(node, parent) {
        this.current = node;
        this.parent = parent;
    }
    /**
     * Get a new NodeCursor and the node that it will be updating
     */
    static init(source) {
        // Create a copy of source for the cursor.
        const copy = this.cloneNode(source);
        return [new NodeCursor(copy, null), copy];
    }
    static cloneNode(node) {
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
    move(move) {
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
    moveOrInsert(move) {
        const child = this.current.children[move];
        if (child === undefined) {
            this.moveToChild(move, {
                ...newNode(),
                priority: this.current.priority,
            });
            return true;
        }
        else {
            this.moveToChild(move, NodeCursor.cloneNode(child));
            return false;
        }
    }
    /**
     * Get a list of cursors for all child nodes
     */
    childCursors() {
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
    parentNode() {
        var _a;
        return (_a = this.parent) === null || _a === void 0 ? void 0 : _a.current;
    }
    /**
     * Move to the parent node
     */
    moveToParent() {
        if (this.parent === null) {
            return false;
        }
        this.current = this.parent.current;
        this.parent = this.parent.parent;
        return true;
    }
    moveToChild(move, child) {
        this.current.children[move] = child;
        this.parent = { ...this };
        this.current = child;
    }
    /**
     * Try to remove a child node
     */
    removeChild(move) {
        var _a;
        const child = (_a = this.current.children[move]) !== null && _a !== void 0 ? _a : null;
        delete this.current.children[move];
        return child;
    }
    /**
     * Move to a descendant node, updating the cursor
     *
     * This tries to make all moves in moves.  On failure, it will return false and the cursor will
     * be on the last node that existed.
     */
    bulkMove(moves) {
        for (const move of moves) {
            if (!this.move(move)) {
                return false;
            }
        }
        return true;
    }
    clone() {
        return new NodeCursor(this.current, this.parent);
    }
}
exports.NodeCursor = NodeCursor;
/**
 * Convert a `Node` into a list of `SplitNodes`
 */
function splitNode(initialPosition, node, rootNodeId) {
    const splitNodes = [];
    function visit(position, currentNode) {
        const splitNode = {
            ...currentNode,
            nodeId: currentNode === node ? rootNodeId : (0, uuid_1.v4)(),
            position: normalizeFen(position),
            children: Object.fromEntries(Object.entries(currentNode.children).map(([move, childNode]) => [
                move,
                visit((0, chessLogic_1.makeMove)(position, move), childNode),
            ])),
        };
        splitNodes.push(splitNode);
        return splitNode.nodeId;
    }
    visit(initialPosition, node);
    return splitNodes;
}
exports.splitNode = splitNode;
/**
 * Convert a list of `SplitNodes` back into a `Node`
 */
function combineNodes(splitNodes, rootNodeId) {
    const nodeMap = Object.fromEntries(splitNodes.map((node) => [node.nodeId, node]));
    function makeNode(nodeId) {
        const splitNode = nodeMap[nodeId];
        if (splitNode === undefined) {
            throw Error(`combineNodes: missing node: ${nodeId}`);
        }
        const { position: _position, nodeId: _nodeId, ...splitNodeWithoutExtraFields } = splitNode;
        return {
            ...splitNodeWithoutExtraFields,
            children: Object.fromEntries(Object.entries(splitNode.children).map(([move, nodeId]) => [
                move,
                makeNode(nodeId),
            ])),
        };
    }
    return makeNode(rootNodeId);
}
exports.combineNodes = combineNodes;
const normalizeFen = (position) => position.slice(0, -3) + "0 1";
