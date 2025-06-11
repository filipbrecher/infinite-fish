import type {Element, Save, Settings, Workspace} from "../types/dbSchema";
import {SETTINGS_KEY} from "./dbSchema";


export const DEFAULT_SETTINGS: Settings = {
    id: SETTINGS_KEY,
    theme: "dark",
}

export const DEFAULT_SAVE_NAME: string = "New Save";
export const MAX_SAVE_NAME_LENGTH: number = 30;
export const DEFAULT_SAVE: Partial<Save> = {
    datetimeUpdated: 0,
    elementCount: 4,
    recipeCount: 0,
    discoveryCount: 0,
}
export const DEFAULT_ELEMENTS: Partial<Element>[] = [
    { emoji: "💧", text: "Water", },
    { emoji: "🔥", text: "Fire", },
    { emoji: "🌬️", text: "Wind", },
    { emoji: "🌍", text: "Earth", },
];

export const DEFAULT_WORKSPACE_NAME: string = "Workspace";
export const DEFAULT_WORKSPACE: Partial<Workspace> = {
    x: 0,
    y: 0,
    scale: 1,
}
