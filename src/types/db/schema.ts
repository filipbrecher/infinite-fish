import type {MouseProps, Theme, WheelProps} from "../../constants/settings";

export interface IDBTransactionEvent extends Event {
    target: IDBTransaction;
}
export type AbortReason = string | undefined;

//============ SETTINGS ============//
export type SettingsProps = {id: number} & {
    general: {
        theme: Theme;
        showSeparator: boolean;
        allowNothing: boolean;
    },
    controls: {
        workspacePanning: MouseProps;
        workspaceZooming: WheelProps;
        instanceSelecting: MouseProps;
        instanceDragging: MouseProps;
        instanceCopying: MouseProps;
        instanceDeleting: MouseProps;
        elementToggleVisibility: MouseProps;
        viewInfo: MouseProps;
        viewCopyEmojiText: MouseProps;
    },
    sidebar: {
        resultLimit: number;
        debounce: number;
        showUnicodeInput: boolean;
        showReverseToggle: boolean;
        showHiddenToggle: boolean;
        showDiscoveryToggle: boolean;
    },
    tooltips: {
        // todo
    },
    logger: {
        logRecipes: boolean;
        logInfo: boolean;
        logWarning: boolean;
        logError: boolean;
        logDb: boolean;
        logSettings: boolean;
        logPopup: boolean;
        logState: boolean;
        logBoard: boolean;
        logSidebar: boolean;
        logWorkspace: boolean;
        logInstance: boolean;
        logView: boolean;
    }
};


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

