import { Annotations, Move, Nag, Node, Priority } from "./book";
import * as NodeReducer from "./NodeReducer";
/**
 * State for the reducer
 *
 * @field moves current moves on the board
 *
 */
export type State = NodeReducer.State & {
    moves: Move[];
};
export type Action = ActionSetMoves | ActionAdd | ActionDeleteBranch | ActionDeleteNode | ActionSetComment | ActionSetAnnotations | ActionSetNags | ActionSetPriority | ActionUndo | ActionRedo | ActionResetUndo;
/**
 * Change the current `moves`
 */
export interface ActionSetMoves {
    type: "set-moves";
    moves: Move[];
}
/**
 * Add `moves` to `rootNode`
 *
 * Only valid if `moves` does not point to a node in the node tree.
 */
export interface ActionAdd {
    type: "add";
}
/**
 * Delete the current node
 *
 * Only valid if `moves` points to a node in the node tree.
 */
export interface ActionDeleteNode {
    type: "delete-node";
}
/**
 * Delete the current branch
 *
 * This takes finds the last branch in `moves`.  It walks backwards to find the last node with only
 * 1 child.  Then it deletes that node.
 *
 * Only valid if `moves` points to a node in the node tree.
 */
export interface ActionDeleteBranch {
    type: "delete-branch";
}
export interface ActionSetComment {
    type: "set-comment";
    comment: string;
}
export interface ActionSetAnnotations {
    type: "set-annotations";
    annotations: Annotations;
}
export interface ActionSetNags {
    type: "set-nags";
    nags: Nag[];
}
export interface ActionSetPriority {
    type: "set-priority";
    priority: Priority;
}
export interface ActionUndo {
    type: "undo";
}
export interface ActionRedo {
    type: "redo";
}
export interface ActionResetUndo {
    type: "reset-undo";
}
export declare function initialState(node: Node): State;
export declare function reduce(state: State, action: Action): State;
