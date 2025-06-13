
export interface IDBTransactionEvent extends Event {
    target: IDBTransaction;
}
export type AbortReason = string | undefined;

//============ SETTINGS ============//
export enum KeyState {
    YES = "yes",
    NO = "no",
    ANY = "any",
}
export enum KeyProps {
    CTRL = "ctrlKey",
    SHIFT = "shiftKey",
    ALT = "altKey",
    META = "metaKey",
}
export enum ButtonProps {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
    BROWSER_BACK = 3,
    BROWSER_FORWARD = 4,
}

export type KeyPropsRecord = Record<KeyProps, KeyState>;
export type WheelProps = KeyPropsRecord;
export type MouseProps = {
    keys: KeyPropsRecord;
    buttons: Set<ButtonProps>;
}

export type SettingsProps = {
    id: number;
    theme: "light" | "dark";

    workspacePanning: MouseProps;
    workspaceZooming: WheelProps;
    instanceSelecting: MouseProps;

    instanceDragging: MouseProps;
    instanceCopying: MouseProps;
    instanceDeleting: MouseProps;
    elementToggleVisibility: MouseProps; // item in sidebar

    viewInfo: MouseProps;
    viewCopyEmojiText: MouseProps; // copy emoji if mouse over emoji, copy text if mouse over text
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
    Element,
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
