"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineNodes = exports.splitNode = exports.calcNodeInfo = exports.getDescendant = exports.childCount = exports.newNode = exports.removeEndgamePosition = exports.addEndgamePosition = exports.newEndgamePosition = exports.newEndgameBook = exports.newOpeningBook = exports.nagText = exports.POSITION_NAGS = exports.MOVE_NAGS = exports.Nag = void 0;
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
function addEndgamePosition(book, color, position) {
    return updatePositions(book, (positions) => [
        ...positions,
        {
            id: (0, uuid_1.v4)(),
            position,
            color,
            rootNode: newNode(),
        },
    ]);
}
exports.addEndgamePosition = addEndgamePosition;
/**
 * Remove a position from an endgame book
 */
function removeEndgamePosition(book, positionId) {
    return updatePositions(book, (positions) => positions.filter((p) => p.id != positionId));
}
exports.removeEndgamePosition = removeEndgamePosition;
function updatePositions(book, operation) {
    var _a, _b;
    const positions = operation(book.positions);
    const position = (_b = (_a = positions[0]) === null || _a === void 0 ? void 0 : _a.position) !== null && _b !== void 0 ? _b : GENERIC_ENDGAME;
    return { ...book, positions, position };
}
function newNode() {
    return {
        children: {},
        comment: "",
        annotations: {
            squares: [],
            arrows: [],
        },
        nags: [],
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
 * Calculate information about a node
 *
 */
function calcNodeInfo(node) {
    if (childCount(node) == 0) {
        return {
            lineCount: 1,
            childCount: 0,
            childLineCount: {},
            maxDepth: 0,
        };
    }
    const info = {
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
exports.calcNodeInfo = calcNodeInfo;
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
