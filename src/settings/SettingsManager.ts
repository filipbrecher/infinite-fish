import {app} from "../main";
import {SETTINGS_KEY, type Settings} from "../storage/types";

export const DEFAULT_SETTINGS: Settings = {
    id: SETTINGS_KEY,
    theme: "dark",
}

export class SettingsManager {
    private _settings: Settings;
    public get settings() {
        return this._settings;
    }

    public async init(): Promise<boolean> {
        const loaded = await app.database.loadSettings();
        if ( !loaded) {
            return false;
        }
        this._settings = loaded;
        return true;
    }
}
