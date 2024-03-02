import { Annotations, Move, Nag, Node, Priority } from "./book";
export interface State {
    node: Node;
    canUndo: boolean;
    canRedo: boolean;
    undoStack: Node[];
    redoStack: Node[];
}
export type Action = ActionAdd | ActionDelete | ActionSetComment | ActionSetAnnotations | ActionSetNags | ActionSetPriority | ActionUndo | ActionRedo;
export interface ActionAdd {
    type: "add";
    moves: Move[];
}
export interface ActionDelete {
    type: "delete";
    moves: Move[];
}
export interface ActionSetComment {
    type: "set-comment";
    moves: Move[];
    comment: string;
}
export interface ActionSetAnnotations {
    type: "set-annotations";
    moves: Move[];
    annotations: Annotations;
}
export interface ActionSetNags {
    type: "set-nags";
    moves: Move[];
    nags: Nag[];
}
export interface ActionSetPriority {
    type: "set-priority";
    moves: Move[];
    priority: Priority;
}
export interface ActionUndo {
    type: "undo";
}
export interface ActionRedo {
    type: "redo";
}
export declare function initialState(node: Node): State;
export declare function reduce(state: State, action: Action): State;
