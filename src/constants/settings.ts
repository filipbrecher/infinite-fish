import {ButtonProps, KeyProps, Theme} from "../types/db/schema";

export const SECTION_NAME_LIST = ["general", "controls", "sidebar"];

export const THEMES_LIST: Record<Theme, { name: string; background: string; border: string }> = {
    light: {
        name: "Light",
        background: "white",
        border: "black",
    },
    dark: {
        name: "Dark",
        background: "#1c1c1c",
        border: "#2c2c2c",
    },
};

export const SETTINGS_CONTROLS_LIST: {settingsKey: string, title: string, ident: string, isMouse: boolean}[] = [
    {
        settingsKey: "workspacePanning",
        title: "Workspace Panning",
        ident: "panning",
        isMouse: true,
    },
    {
        settingsKey: "workspaceZooming",
        title: "Workspace Zooming",
        ident: "zooming",
        isMouse: false,
    },
    {
        settingsKey: "instanceSelecting",
        title: "Instance Selecting",
        ident: "selecting",
        isMouse: true,
    },
    {
        settingsKey: "instanceDragging",
        title: "Instance Dragging",
        ident: "dragging",
        isMouse: true,
    },
    {
        settingsKey: "instanceCopying",
        title: "Instance Copying",
        ident: "copying",
        isMouse: true,
    },
    {
        settingsKey: "instanceDeleting",
        title: "Instance Deleting",
        ident: "deleting",
        isMouse: true,
    },
    {
        settingsKey: "elementToggleVisibility",
        title: "Element Visibility Toggle",
        ident: "visibility",
        isMouse: true,
    },
    {
        settingsKey: "viewInfo",
        title: "Element Info Viewing",
        ident: "info",
        isMouse: true,
    },
    {
        settingsKey: "viewCopyEmojiText",
        title: "Element Emoji/Text Copy",
        ident: "emoji-text",
        isMouse: true,
    },
];

export const SETTINGS_BUTTONS_LIST: {props: ButtonProps, title: string}[] = [
    {
        props: ButtonProps.LEFT,
        title: "Left",
    },
    {
        props: ButtonProps.MIDDLE,
        title: "Middle",
    },
    {
        props: ButtonProps.RIGHT,
        title: "Right",
    },
    {
        props: ButtonProps.BROWSER_BACK,
        title: "Back",
    },
    {
        props: ButtonProps.BROWSER_FORWARD,
        title: "Forward",
    },
];

export const SETTINGS_KEYS_LIST: {props: KeyProps, title: string}[] = [
    {
        props: KeyProps.CTRL,
        title: "Ctrl",
    },
    {
        props: KeyProps.SHIFT,
        title: "Shift",
    },
    {
        props: KeyProps.ALT,
        title: "Alt",
    },
    {
        props: KeyProps.META,
        title: "Meta",
    },
];

