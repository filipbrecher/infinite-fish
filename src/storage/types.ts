
const DATABASE_NAME: string = "infinite-fish";
const DATABASE_VERSION: number = 1;


//============ SETTINGS ============//
const SETTINGS_STORE: string = "settings";
const SETTINGS_KEY: number = 0;

type Settings = {
    id: number;
    theme: "light" | "dark";
}


//============ SAVES ============//
const SAVE_STORE: string = "saves";

type Save = {
    id: number;
    name: string;
    datetimeCreated: number;
    datetimeUpdated: number;

    elementCount: number;
    recipeCount: number;
    discoveryCount: number;
}


//============ ELEMENTS ============//
const ELEMENT_STORE: string = "elements";

type Recipe = [ // sorted in ascending order
    number,     // id of the first element
    number,     // id of the second element
];

type Element = {
    id: number;
    saveId: number;
    emoji: string;
    text: string;
    discovered?: boolean;   // false by default
    hidden?: boolean;       // false by default
    recipes?: Recipe[];     // [] by default
}


//============ WORKSPACES ============//
const WORKSPACE_STORE: string = "workspaces";

type Workspace = {
    id: number;
    saveId: number;
    name: string;
    x: number;
    y: number;
    scale: number;
}


//============ INSTANCES ============//
const INSTANCE_STORE: string = "instances";

enum InstanceType {
    Element = 0,
}

type ElementInstanceData = number;          // id of the element
type InstanceData = ElementInstanceData;

type Instance = {
    id: number;
    workspaceId: number;
    x: number;
    y: number;
    type?: InstanceType;                    // ElementInstanceData type by default
    data: InstanceData;
}

export {
    DATABASE_NAME, DATABASE_VERSION,
    SETTINGS_STORE, SETTINGS_KEY, Settings,
    SAVE_STORE, Save,
    ELEMENT_STORE, Recipe, Element,
    WORKSPACE_STORE, Workspace,
    INSTANCE_STORE, InstanceType, ElementInstanceData, InstanceData, Instance,
}
