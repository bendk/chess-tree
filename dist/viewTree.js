"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewNodeTree = void 0;
const book_1 = require("./book");
/**
 * Generate a view of a node tree
 *
 * A view node tree is like a node tree, except some nodes may be truncated to avoid showing the
 * user too much at once.
 */
function viewNodeTree(params) {
    return doViewNodeTree(params);
}
exports.viewNodeTree = viewNodeTree;
function doViewNodeTree(params) {
    // Create a fully-expanded node tree
    let result = {
        leadingMoves: [],
        childNodes: Object.entries(params.rootNode.children).map(([move, child]) => makeViewNodeTree(move, child)),
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
            childNodes: expandedChildNodes.map((node) => truncateChildren(node, depth)),
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
function makeViewNodeTree(move, node) {
    const children = {};
    let lineCount = 0;
    let maxDepth = 0;
    if ((0, book_1.childCount)(node) === 0) {
        lineCount = 1;
    }
    else {
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
function resultFitsLimits(result, params) {
    const branchCount = result.childNodes.reduce((partial, node) => partial + node.branchCount, 0);
    const maxChildDepth = Math.max(...result.childNodes.map((node) => node.maxDepth));
    return (branchCount <= params.maxBranches &&
        maxChildDepth + 1 <= params.maxDepth);
}
function truncateChildren(node, depthLeft) {
    if (depthLeft <= 0) {
        return {
            ...node,
            children: undefined,
            branchCount: 1,
            maxDepth: 0,
        };
    }
    else {
        let branchCount = 0;
        let maxDepth = 0;
        const childrenEntries = Object.entries(node.children);
        const children = {};
        if (childrenEntries.length === 0) {
            branchCount = 1;
        }
        else {
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
