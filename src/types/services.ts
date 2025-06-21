import type {SettingsProps} from "./db/schema";


// InputCaptureService
export type EventKind = "mousedown" | "wheel";
export type CaptureLevel = string;
export type InputHandler = (e: MouseEvent | WheelEvent, ...args: any[]) => void;

export type ActionEntry = {
    kind: EventKind;
    settingsKey: keyof SettingsProps;
    handler: InputHandler;
};


// StateService
export const enum State {
    WAITING = "WAITING",
    LOADING_SAVE = "LOADING_SAVE",
    LOADING_WORKSPACE = "LOADING_WORKSPACE",
    RUNNING = "RUNNING",
}

