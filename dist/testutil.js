"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNode = void 0;
const book_1 = require("./book");
/**
 * Quick way to build a node tree
 *
 * @param nodeSpec like a node, except moves are stored inside the `node` object directly rather
 *    than inside the `children` field.
 */
function buildNode(nodeSpec) {
    const currentNode = {
        children: {},
        comment: "",
        annotations: {
            squares: [],
            arrows: [],
        },
        nags: [],
        priority: book_1.Priority.Default,
    };
    for (const [key, value] of Object.entries(nodeSpec)) {
        if (key === "comment" || key === "nags") {
            currentNode[key] = value;
        }
        else if (key === "priority") {
            currentNode.priority = value;
        }
        else if (key === "squares") {
            currentNode.annotations.squares = value;
        }
        else if (key === "arrows") {
            currentNode.annotations.arrows = value;
        }
        else {
            currentNode.children[key] = buildNode(value);
        }
    }
    return currentNode;
}
exports.buildNode = buildNode;
