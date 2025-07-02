import type {ElementProps, SaveProps, WorkspaceProps} from "../types/db/schema";

export const DEFAULT_SIDEBAR_WIDTH: number = 400;


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
