import type {ElementProps, KeyPropsRecord, SaveProps, SettingsProps, WorkspaceProps} from "../types/db/schema";
import {ButtonProps, KeyProps, KeyState} from "../types/db/schema";
import {SETTINGS_KEY} from "./dbSchema";

export const DEFAULT_SIDEBAR_WIDTH: number = 400;

const DEFAULT_KEY_PROPS: KeyPropsRecord = {
    [KeyProps.CTRL]: KeyState.ANY,
    [KeyProps.SHIFT]: KeyState.ANY,
    [KeyProps.ALT]: KeyState.ANY,
    [KeyProps.META]: KeyState.ANY,
};

export const DEFAULT_SETTINGS: SettingsProps = {
    id: SETTINGS_KEY,
    theme: "dark",
    allowCombineToNothing: false,

    searchShowUnicodeInput: false,
    searchShowReverseToggle: true,
    searchShowHiddenToggle: true,
    searchShowDiscoveryToggle: true,
    searchResultLimit: 100,
    searchResultDebounce: 0,

    workspacePanning: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.CTRL]: KeyState.YES,
        },
        buttons: ButtonProps.MIDDLE,
    },
    workspaceZooming: {
        ...DEFAULT_KEY_PROPS,
        [KeyProps.CTRL]: KeyState.YES,
    },
    instanceSelecting: {
        keys: {
            ...DEFAULT_KEY_PROPS,
        },
        buttons: ButtonProps.LEFT,
    },

    instanceDragging: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.NO,
            [KeyProps.CTRL]: KeyState.NO,
        },
        buttons: ButtonProps.LEFT,
    },
    instanceCopying: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.NO,
            [KeyProps.CTRL]: KeyState.NO,
        },
        buttons: ButtonProps.MIDDLE,
    },
    instanceDeleting: {
        keys: DEFAULT_KEY_PROPS,
        buttons: ButtonProps.RIGHT,
    },
    elementToggleVisibility: {
        keys: DEFAULT_KEY_PROPS,
        buttons: ButtonProps.RIGHT,
    },

    viewInfo: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.YES,
        },
        buttons: ButtonProps.LEFT,
    },
    viewCopyEmojiText: {
        keys: {
            ...DEFAULT_KEY_PROPS,
            [KeyProps.SHIFT]: KeyState.YES,
            [KeyProps.CTRL]: KeyState.NO,
        },
        buttons: ButtonProps.MIDDLE,
    },
};


export const DEFAULT_SAVE_NAME: string = "New Save";
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
