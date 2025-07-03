import type {SettingsProps} from "./db/schema";


// Logger
export type LogLevel = "info" | "warning" | "error";
export type LogType = "db" | "settings" | "popup" | "state" | "board" | "sidebar" | "workspace" | "instance" | "view" | string;
export type RawLogType = "recipe" | string;
export const EMOJI_BY_LOG_TYPE: Map<LogType, string> = new Map([
    ["db", "🛢️"],
    ["setting", "⚙️"],
    ["popup", "💬"],
    ["state", "🧠"],
    ["board", "🧭"],
    ["sidebar", "🧾"],
    ["workspace", "🗂️"],
    ["instance", "📦"],
    ["view", "🖼️"],
]);


// AudioService
// pop / remove instance + hide element when not showing hidden
// failed to combine
// new instance from old element
// new instance from new element (not first discovery)
// new instance from new element (first discovery)
export enum Sound {
    OPEN_POPUP = "openPopup",
    FAILED_COMBINE = "failedCombine",
    POP = "pop",
    INSTANCE_OLD = "instanceOld",
    INSTANCE_NEW = "instanceNew",
    INSTANCE_DISCOVERY = "instanceDiscovery",
}
export const RARE_AUDIO_CHANCE = 0.01;


// InputCaptureService
export type EventKind = "mousedown" | "wheel";
export type CaptureLevel = string;
export type InputHandler = (e: MouseEvent | WheelEvent, ...args: any[]) => void;

export type ActionEntry = {
    kind: EventKind;
    settingsKey: keyof SettingsProps["controls"];
    handler: InputHandler;
};


// StateService
export const enum State {
    WAITING = "WAITING",
    LOADING_SAVE = "LOADING_SAVE",
    LOADING_WORKSPACE = "LOADING_WORKSPACE",
    RUNNING = "RUNNING",
}

