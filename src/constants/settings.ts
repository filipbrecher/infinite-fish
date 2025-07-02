
import {SettingsPopup} from "../components/options/SettingsPopup";

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


/* CONTENT */
export type SettingsContentType = "themeToggle" | "naturalInput" | "yesNoToggle" | "yesNoConfirmToggle" | "wheelToggles" | "mouseToggles";
export type SettingsContentMap = {
    [C in SettingsContent as C["type"]]: Extract<SettingsContent, { type: C["type"] }>;
};
type BaseSettingsContent<D, T extends SettingsContentType> = {
    type: T,
    default: D,
}

/* theme content */
export const Theme = {
    LIGHT: "light",
    DARK: "dark",
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];
export type SettingsContentThemeToggle = BaseSettingsContent<Theme, "themeToggle">;

/* integer input content */
export type SettingsContentNaturalInput = BaseSettingsContent<number, "naturalInput"> & {
    min?: number;
    max?: number;
};

/* yes no toggle content */
export type SettingsContentYesNoToggle = BaseSettingsContent<boolean, "yesNoToggle">;

/* yes no toggle with confirmations content */
export type SettingsContentConfirmToggle = BaseSettingsContent<boolean, "yesNoConfirmToggle"> & {
    beforeYesMessage?: string;
    beforeNoMessage?: string;
}

/* wheel and mouse toggles content */
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

export type SettingsContentWheelToggles = BaseSettingsContent<WheelProps, "wheelToggles">;
export type SettingsContentMouseToggles = BaseSettingsContent<MouseProps, "mouseToggles">;

const DEFAULT_KEY_PROPS: KeyPropsRecord = {
    [KeyProps.CTRL]: KeyState.ANY,
    [KeyProps.SHIFT]: KeyState.ANY,
    [KeyProps.ALT]: KeyState.ANY,
    [KeyProps.META]: KeyState.ANY,
};

/* all contents */
export type SettingsContent =
    SettingsContentThemeToggle |
    SettingsContentNaturalInput |
    SettingsContentYesNoToggle |
    SettingsContentConfirmToggle |
    SettingsContentWheelToggles |
    SettingsContentMouseToggles;


/* ROW */
export type SettingsSectionRow = {
    key: string;

    title?: {
        label: string;
        description?: string;
        icon?: string; // variable of the image's url
    }
    getTitle?: (sectionKey: SettingsSectionKey, rowKey: string) => HTMLDivElement;

    content: SettingsContent;
};


/* SECTION */
export const SECTION_KEY_LIST = ["general", "controls", "sidebar", "tooltips"];
export type SettingsSectionKey = typeof SECTION_KEY_LIST[number];
export type SettingsSection = {
    key: SettingsSectionKey;
    label: string;
    rows: SettingsSectionRow[];
}


/* SETTINGS config */
export const SETTINGS_CONFIG: SettingsSection[] = [
    {
        key: "general",
        label: "General",
        rows: [
            {
                key: "theme",
                title: { label: "Theme" },
                content: { type: "themeToggle", default: "light" }
            },
            {
                key: "showSeparator",
                title: { label: "Show Emoji Separator" },
                content: { type: "yesNoToggle", default: false }
            },
            {
                key: "allowNothing",
                getTitle: () => SettingsPopup.getNothingToggleTitle(),
                content: {
                    type: "yesNoConfirmToggle",
                    default: false,
                    beforeYesMessage:
                        "Are you sure you want to allow the Nothing element? " +
                        "If you ever use it in a recipe, then on Infinibrowser that recipe becomes invalid, " +
                        "and it will break all lineages that require it !!! " +
                        "Proceed only if you understand the risks."
                }
            }
        ]
    },
    {
        key: "controls",
        label: "Controls",
        rows: [
            {
                key: "workspacePanning",
                title: { label: "Workspace Panning", description: "Allows you to move around the workspace." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: {
                            ...DEFAULT_KEY_PROPS,
                            [KeyProps.CTRL]: KeyState.YES,
                        },
                        buttons: ButtonProps.MIDDLE,
                    }
                }
            },
            {
                key: "workspaceZooming",
                title: { label: "Workspace Zooming", description: "You can zoom using the scroll wheel." },
                content: {
                    type: "wheelToggles",
                    default: {
                        ...DEFAULT_KEY_PROPS,
                        [KeyProps.CTRL]: KeyState.YES,
                    }
                }
            },
            {
                key: "instanceSelecting",
                title: { label: "Instance Selecting", description: "Hold and drag your mouse to select instances. You can pan the workspace concurrently. Selected instances cannot be dropped over the sidebar and also cannot combine when dragging (they can when you drop over them)." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: {
                            ...DEFAULT_KEY_PROPS,
                        },
                        buttons: ButtonProps.LEFT,
                    }
                }
            },
            {
                key: "instanceDragging",
                title: { label: "Instance Dragging", description: "You can move instances with this. When moving a selected instance, all other selected instances move with it." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: {
                            ...DEFAULT_KEY_PROPS,
                            [KeyProps.SHIFT]: KeyState.NO,
                            [KeyProps.CTRL]: KeyState.NO,
                        },
                        buttons: ButtonProps.LEFT,
                    }
                }
            },
            {
                key: "instanceCopying",
                title: { label: "Instance Copying", description: "You can either click and hold to grab a clone of instances, or press this button while moving instances to copy them in place." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: {
                            ...DEFAULT_KEY_PROPS,
                            [KeyProps.SHIFT]: KeyState.NO,
                            [KeyProps.CTRL]: KeyState.NO,
                        },
                        buttons: ButtonProps.MIDDLE,
                    }
                }
            },
            {
                key: "instanceDeleting",
                title: { label: "Instance Deleting", description: "Press this to delete a single instance. You can also keep holding this and when you move your mouse, all instances under your cursor will get deleted. Selected instances always get deleted together." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: DEFAULT_KEY_PROPS,
                        buttons: ButtonProps.RIGHT,
                    }
                }
            },
            {
                key: "elementToggleVisibility",
                title: { label: "Element Visibility Toggle", description: "Press this over an element in the sidebar to hide or unhide it." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: DEFAULT_KEY_PROPS,
                        buttons: ButtonProps.RIGHT,
                    }
                }
            },
            {
                key: "viewInfo",
                title: { label: "Element Info Viewing", description: "Press this over an element to view its info / recipes." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: {
                            ...DEFAULT_KEY_PROPS,
                            [KeyProps.SHIFT]: KeyState.YES,
                        },
                        buttons: ButtonProps.LEFT,
                    }
                }
            },
            {
                key: "viewCopyEmojiText",
                title: { label: "Element's Emoji/Text Copying", description: "Click an emoji to copy its text to clipboard, click the element's text to copy it to clipboard." },
                content: {
                    type: "mouseToggles",
                    default: {
                        keys: {
                            ...DEFAULT_KEY_PROPS,
                            [KeyProps.SHIFT]: KeyState.YES,
                            [KeyProps.CTRL]: KeyState.NO,
                        },
                        buttons: ButtonProps.MIDDLE,
                    }
                }
            },
        ]
    },
    {
        key: "sidebar",
        label: "Sidebar",
        rows: [
            {
                key: "resultLimit",
                title: { label: "Elements In Sidebar Limit" },
                content: {
                    type: "naturalInput",
                    default: 0,
                    min: 0,
                }
            },
            {
                key: "debounce",
                title: { label: "Debounce (in ms)" },
                content: {
                    type: "naturalInput",
                    default: 0,
                    min: 0,
                }
            },
            {
                key: "showUnicodeInput",
                title: { label: "Show Unicode Input", icon: "--unicode-input-icon" },
                content: { type: "yesNoToggle", default: false }
            },
            {
                key: "showHiddenToggle",
                title: { label: "Show Hidden Elements Toggle", icon: "--unhide-elements-icon" },
                content: { type: "yesNoToggle", default: true }
            },
            {
                key: "showDiscoveryToggle",
                title: { label: "Show Discovered Elements Toggle", icon: "--discovery-icon" },
                content: { type: "yesNoToggle", default: true }
            },
            {
                key: "showReverseToggle",
                title: { label: "Show Reversed Order Toggle", icon: "--order-a-z-icon" },
                content: { type: "yesNoToggle", default: true }
            },
        ]
    },
    {
        key: "tooltips",
        label: "Tooltips",
        rows: [
            // todo
        ]
    }
] as const;
