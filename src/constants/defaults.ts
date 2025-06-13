import type {ElementProps, KeyPropsRecord, SaveProps, SettingsProps, WorkspaceProps} from "../types/dbSchema";
import {ButtonProps, KeyProps, KeyState} from "../types/dbSchema";
import {SETTINGS_KEY} from "./dbSchema";

export const ZOOM_AMOUNT: number = 0.05;
export const MAX_ZOOM: number = 10;
export const MIN_ZOOM: number = 0.1;

const DEFAULT_KEY_PROPS: KeyPropsRecord = {
    [KeyProps.CTRL]: KeyState.ANY,
    [KeyProps.SHIFT]: KeyState.ANY,
    [KeyProps.ALT]: KeyState.ANY,
    [KeyProps.META]: KeyState.ANY,
};

export const DEFAULT_SETTINGS: SettingsProps = {
    id: SETTINGS_KEY,
    theme: "dark",

    workspacePanning: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.CTRL]: KeyState.YES,
        },
        buttons: new Set([ButtonProps.LEFT]),
    },
    workspaceZooming: {
        ...DEFAULT_KEY_PROPS,
        [KeyProps.CTRL]: KeyState.YES,
    },
    instanceSelecting: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.CTRL]: KeyState.NO,
        },
        buttons: new Set([ButtonProps.LEFT]),
    },

    instanceDragging: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.NO,
            [KeyProps.CTRL]: KeyState.NO,
        },
        buttons: new Set([ButtonProps.LEFT]),
    },
    instanceCopying: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.NO,
        },
        buttons: new Set([ButtonProps.MIDDLE]),
    },
    instanceDeleting: {
        keys: DEFAULT_KEY_PROPS,
        buttons: new Set([ButtonProps.RIGHT]),
    },
    elementToggleVisibility: {
        keys: DEFAULT_KEY_PROPS,
        buttons: new Set([ButtonProps.RIGHT]),
    },

    viewInfo: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.YES,
            [KeyProps.CTRL]: KeyState.NO,
        },
        buttons: new Set([ButtonProps.LEFT]),
    },
    viewCopyEmojiText: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.YES,
        },
        buttons: new Set([ButtonProps.MIDDLE]),
    },
};


export const DEFAULT_SAVE_NAME: string = "New Save";
export const MAX_SAVE_NAME_LENGTH: number = 30;
export const SAVE_ACTIVE_AT_TIMEOUT: number = 10000; // milliseconds
export const DEFAULT_SAVE: Partial<SaveProps> = {
    datetimeCreated: 0,
    elementCount: 4,
    recipeCount: 0,
    discoveryCount: 0,
}
export const DEFAULT_ELEMENTS: Partial<ElementProps>[] = [
    { emoji: "💧", text: "Water", },
    { emoji: "🔥", text: "Fire", },
    { emoji: "🌬️", text: "Wind", },
    { emoji: "🌍", text: "Earth", },
];

export const DEFAULT_WORKSPACE_NAME: string = "Workspace";
export const DEFAULT_WORKSPACE: Partial<WorkspaceProps> = {
    x: 0,
    y: 0,
    scale: 1,
}
