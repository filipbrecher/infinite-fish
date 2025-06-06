
const DATABASE_NAME: string = "infinite-fish";
const DATABASE_VERSION: number = 1;


//============ SETTINGS ============//
const SETTINGS_STORE: string = "settings";

type Settings = {
    theme: "light" | "dark";
}


//============ SAVES ============//
const SAVE_STORE: string = "saves";

type Save = {
    id: number;
    name: string;
    description: string;
    datetimeCreated: number;
    datetimeUpdated: number;

    // metadata
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
    recipes?: Recipe[];
}


//============ WORKSPACES ============//
const WORKSPACE_STORE: string = "workspaces";

type Workspace = {
    id: number;
    saveId: number;
    name: string;
}


//============ INSTANCES ============//
const INSTANCE_STORE: string = "instances";

enum InstanceType {
    Element = 0,
}

type ElementInstanceData = number;          // id
type InstanceData = ElementInstanceData;

type Instance = {
    id: number;
    workspaceId: number;
    x: number;
    y: number;
    type: InstanceType;
    data: InstanceData;
}

export {
    DATABASE_NAME,
    DATABASE_VERSION,
    SETTINGS_STORE,
    Settings,
    SAVE_STORE,
    Save,
    ELEMENT_STORE,
    Recipe,
    Element,
    WORKSPACE_STORE,
    Workspace,
    INSTANCE_STORE,
    InstanceType,
    ElementInstanceData,
    InstanceData,
    Instance,
}
