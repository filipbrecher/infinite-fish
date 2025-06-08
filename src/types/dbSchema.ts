
export interface IDBTransactionEvent extends Event {
    target: IDBTransaction;
}
export type AbortReason = string | undefined;

//============ SETTINGS ============//
export type Settings = {
    id: number;
    theme: "light" | "dark";
}


//============ SAVES ============//
export type Save = {
    id: number;
    name: string;
    datetimeCreated: number;
    datetimeUpdated: number;

    elementCount: number;
    recipeCount: number;
    discoveryCount: number;
}


//============ ELEMENTS ============//
export type Recipe = [  // sorted in ascending order
    number,             // id of the first element
    number,             // id of the second element
];

export type Element = {
    id: number;
    saveId: number;
    emoji: string;
    text: string;
    discovered?: boolean;   // false by default
    hidden?: boolean;       // false by default
    recipes?: Recipe[];     // [] by default
}


//============ WORKSPACES ============//
export type Workspace = {
    id: number;
    saveId: number;
    position: number;
    name: string;
    x: number;
    y: number;
    scale: number;
}


//============ INSTANCES ============//
export enum InstanceType {
    Element = 0,
}

export type ElementInstanceData = number;   // id of the element
export type InstanceData = ElementInstanceData;

export type Instance = {
    id: number;
    workspaceId: number;
    x: number;
    y: number;
    type?: InstanceType;    // ElementInstanceData type by default
    data: InstanceData;
}

