import { Node } from "./book";
/**
 * Quick way to build a node tree
 *
 * @param nodeSpec like a node, except moves are stored inside the `node` object directly rather
 *    than inside the `children` field.
 */
export declare function buildNode(nodeSpec: object): Node;
