import {app} from "../main";
import type {KeyPropsRecord, MouseProps, SettingsProps, WheelProps} from "../types/dbSchema";
import {ButtonProps, KeyState} from "../types/dbSchema";


type EventKind = "mousedown" | "wheel";
type CaptureLevel = string;
type InputHandler = (e: MouseEvent | WheelEvent) => void;

type ActionEntry = {
    kind: EventKind;
    settingsKey: keyof SettingsProps;
    handler: InputHandler;
};

export class InputCaptureService {
    private levels: Map<CaptureLevel, ActionEntry[]> = new Map();

    public init() {}

    public set(level: CaptureLevel, entries: ActionEntry[]) {
        this.levels.set(level, entries);
    }

    private static satisfiesKeys(event: MouseEvent | WheelEvent, expectedKeys: KeyPropsRecord): boolean {
        return Object.entries(expectedKeys).every(([key, expected]) => {
            const actual = event[key as keyof MouseEvent] || false;
            switch (expected as KeyState) {
                case KeyState.YES: return actual;
                case KeyState.NO: return !actual;
                case KeyState.ANY: return true;
            }
        });
    }

    private static satisfiesMouseDown(event: MouseEvent, config: MouseProps): boolean {
        return (
            this.satisfiesKeys(event, config.keys) &&
            config.buttons.has(event.button as ButtonProps)
        );
    }

    private static satisfiesWheel(event: WheelEvent, config: WheelProps): boolean {
        return this.satisfiesKeys(event, config);
    }

    public matchMouseDown(level: string, event: MouseEvent): InputHandler {
        const entries = this.levels.get(level) ?? [];
        for (const entry of entries) {
            if (entry.kind === "mousedown") {
                const config = app.settings.settings[entry.settingsKey] as MouseProps;
                if (InputCaptureService.satisfiesMouseDown(event, config)) {
                    return entry.handler;
                }
            }
        }
        return () => {};
    }

    public matchWheel(level: string, event: WheelEvent): InputHandler {
        const entries = this.levels.get(level) ?? [];
        for (const entry of entries) {
            if (entry.kind === "wheel") {
                const config = app.settings.settings[entry.settingsKey] as WheelProps;
                if (InputCaptureService.satisfiesWheel(event, config)) {
                    return entry.handler;
                }
            }
        }
        return () => {};
    }
}