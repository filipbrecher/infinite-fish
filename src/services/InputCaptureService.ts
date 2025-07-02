import {app} from "../main";
import type {KeyPropsRecord, MouseProps, WheelProps} from "../constants/settings";
import {ButtonProps, KeyState} from "../constants/settings";
import type {ActionEntry, CaptureLevel, InputHandler} from "../types/services";


export class InputCaptureService {
    private levels: Map<CaptureLevel, ActionEntry[]> = new Map();

    private static readonly buttonToButtonsBit: number[] = [
        ButtonProps.LEFT, ButtonProps.MIDDLE, ButtonProps.RIGHT, ButtonProps.BROWSER_BACK, ButtonProps.BROWSER_FORWARD
    ];

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

    private static satisfiesButtons(event: MouseEvent, buttons: number): boolean {
        return (buttons & this.buttonToButtonsBit[event.button]) !== 0;
    }

    private static satisfiesMouseDown(event: MouseEvent, config: MouseProps): boolean {
        return this.satisfiesKeys(event, config.keys) && this.satisfiesButtons(event, config.buttons);
    }

    private static satisfiesWheel(event: WheelEvent, config: WheelProps): boolean {
        return this.satisfiesKeys(event, config);
    }

    public matchMouseDown(level: string, event: MouseEvent): InputHandler {
        const entries = this.levels.get(level) ?? [];
        for (const entry of entries) {
            if (entry.kind !== "mousedown") continue;

            const config = app.settings.settings.controls[entry.settingsKey] as MouseProps;
            if (InputCaptureService.satisfiesMouseDown(event, config)) {
                return entry.handler;
            }
        }
        return () => {};
    }

    public matchMouseUp(event: MouseEvent, handler: InputHandler): boolean {
        for (const entries of this.levels.values()) {
            for (const entry of entries) {
                if (entry.kind !== "mousedown") continue;

                const config = app.settings.settings.controls[entry.settingsKey] as MouseProps;
                if (entry.handler === handler && (event.buttons & config.buttons)) {
                    return false;
                }
            }
        }
        return true;
    }

    public matchWheel(level: string, event: WheelEvent): InputHandler {
        const entries = this.levels.get(level) ?? [];
        for (const entry of entries) {
            if (entry.kind !== "wheel") continue;

            const config = app.settings.settings.controls[entry.settingsKey] as WheelProps;
            if (InputCaptureService.satisfiesWheel(event, config)) {
                return entry.handler;
            }
        }
        return () => {};
    }
}
