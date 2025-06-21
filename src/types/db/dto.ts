import {RecipeProps, ViewDataProps, ViewTypeProps} from "./schema";


//============ ELEMENTS ============//
export type UpsertElementProps = {
    saveId: number;
    id: number;
    emoji: string;
    text: string;
    discovery?: boolean;   // false by default
    recipe?: RecipeProps;  // if for some reason the recipe isn't known or has already been detected as duplicate
}


//============ WORKSPACES ============//
export type WorkspaceChangesProps = {
    name: string;
    x: number;
    y: number;
    scale: number;
}


//============ INSTANCES ============//
export type NewInstanceProps = {
    x: number;
    y: number;
    zIndex: number;
    type?: ViewTypeProps;
    data: ViewDataProps;
}

export type InstanceMoveProps = {
    workspaceId: number;
    id: number,
    x: number,
    y: number,
    zIndex: number,
}
