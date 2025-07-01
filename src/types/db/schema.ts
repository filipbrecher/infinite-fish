
export interface IDBTransactionEvent extends Event {
    target: IDBTransaction;
}
export type AbortReason = string | undefined;

//============ SETTINGS ============//
export const Theme = {
    LIGHT: "light",
    DARK: "dark",
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export const enum KeyState {
    YES = "yes",
    NO = "no",
    ANY = "any",
}
export const enum KeyProps {
    CTRL = "ctrlKey",
    SHIFT = "shiftKey",
    ALT = "altKey",
    META = "metaKey",
}
export const enum ButtonProps {
    LEFT = 1,
    MIDDLE = 4,
    RIGHT = 2,
    BROWSER_BACK = 8,
    BROWSER_FORWARD = 16,
}

export type KeyPropsRecord = Record<KeyProps, KeyState>;
export type WheelProps = KeyPropsRecord;
export type MouseProps = {
    keys: KeyPropsRecord;
    buttons: number;
}

export type SettingsProps = {
    id: number;

    // GENERAL
    theme: Theme;
    showEmojiTextSeparator: boolean;
    allowCombineToNothing: boolean;

    // SIDEBAR
    searchResultLimit: number;      // 0 for unlimited
    searchResultDebounce: number;   // in ms
    searchShowUnicodeInput: boolean;
    searchShowHiddenToggle: boolean;
    searchShowDiscoveryToggle: boolean;
    searchShowReverseToggle: boolean;

    // CONTROLS
    // workspace
    workspacePanning: MouseProps;
    workspaceZooming: WheelProps;
    instanceSelecting: MouseProps;

    // instance
    instanceDragging: MouseProps;
    instanceCopying: MouseProps;
    instanceDeleting: MouseProps;

    // element
    elementToggleVisibility: MouseProps; // item in sidebar

    // view
    viewInfo: MouseProps;
    viewCopyEmojiText: MouseProps; // copy emoji if mouse over emoji, copy text if mouse over text
}


//============ SAVES ============//
export type SaveProps = {
    id: number;
    name: string;
    datetimeCreated: number;
    datetimeActive: number;
    lastActiveWorkspaceId: number;

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
    saveId: number;
    id: number;
    emoji: string;
    text: string;
    discovery?: boolean;   // false by default
    hide?: boolean;       // false by default
    recipes?: RecipeProps[];     // [] by default
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


//============ INSTANCES ============//
export const enum ViewTypeProps {
    Element,
    GhostElement,
}

export type ElementViewData = number;   // id of the element
export type GhostElementViewData = {
    emoji: string,
    text: string,
};
export type ViewDataProps = ElementViewData | GhostElementViewData;

export type InstanceProps = {
    workspaceId: number;
    id: number;
    x: number;
    y: number;
    zIndex: number;
    type?: ViewTypeProps;    // ElementViewData type by default
    data: ViewDataProps;
}

