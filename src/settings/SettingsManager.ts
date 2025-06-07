import {app} from "../main";
import type {Settings} from "../storage/types";

export class SettingsManager {
    private _settings: Settings;

    constructor() {
        if (!app.database.ready) {
            throw new Error("Cannot initialize settings when database isn't ready.")
        }
    }
}
