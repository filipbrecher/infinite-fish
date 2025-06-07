import type {Element, Settings} from "../types/dbSchema";
import {SETTINGS_KEY} from "./dbSchema";


export const DEFAULT_SETTINGS: Settings = {
    id: SETTINGS_KEY,
    theme: "dark",
}

export const DEFAULT_SAVE_NAME: string = "New Save";
export const DEFAULT_ELEMENTS: Partial<Element>[] = [
    { emoji: "💧", text: "Water", },
    { emoji: "🔥", text: "Fire", },
    { emoji: "🌬️", text: "Wind", },
    { emoji: "🌍", text: "Earth", },
];
