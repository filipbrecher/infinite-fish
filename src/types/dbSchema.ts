
export interface IDBTransactionEvent extends Event {
    target: IDBTransaction;
}
export type AbortReason = string | undefined;

//============ SETTINGS ============//
export type SettingsProps = {
    id: number;
    theme: "light" | "dark";
}


//============ SAVES ============//
export type SaveProps = {
    id: number;
    name: string;
    datetimeCreated: number;
    datetimeActive: number;

    elementCount: number;
    recipeCount: number;
    discoveryCount: number;
}


//============ ELEMENTS ============//
export type RecipeProps = [  // sorted in ascending order
    number,             // id of the first element
    number,             // id of the second element
];

export type ElementProps = {
    id: number;
    saveId: number;
    emoji: string;
    text: string;
    discovery?: boolean;   // false by default
    hide?: boolean;       // false by default
    recipes?: RecipeProps[];     // [] by default
}

export type NewElementProps = {
    emoji: string;
    text: string;
    discovery?: boolean;   // false by default;
}


//============ WORKSPACES ============//
export type WorkspaceProps = {
    id: number;
    saveId: number;
    position: number;   // positions go always from 1 ... n (number of workspaces in a given save)
    name: string;
    x: number;
    y: number;
    scale: number;
}

export type WorkspaceChangesProps = {
    name: string;
    x: number;
    y: number;
    scale: number;
}


//============ INSTANCES ============//
export enum InstanceTypeProps {
    Element = 0,
}

export type ElementInstanceData = number;   // id of the element
export type InstanceDataProps = ElementInstanceData;

export type InstanceProps = {
    id: number;
    workspaceId: number;
    x: number;
    y: number;
    type?: InstanceTypeProps;    // ElementInstanceData type by default
    data: InstanceDataProps;
}

export type NewInstanceProps = {
    x: number;
    y: number;
    type?: InstanceTypeProps;
    data: InstanceDataProps;
}
