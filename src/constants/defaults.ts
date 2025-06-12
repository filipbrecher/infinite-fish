import type {ElementProps, SaveProps, SettingsProps, WorkspaceProps} from "../types/dbSchema";
import {SETTINGS_KEY} from "./dbSchema";


export const DEFAULT_SETTINGS: SettingsProps = {
    id: SETTINGS_KEY,
    theme: "dark",
}

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
