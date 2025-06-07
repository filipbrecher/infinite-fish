import {app} from "../main";
import type {Settings} from "../types/dbSchema";


export class SettingsService {
    private _settings: Settings;
    public get settings() {
        return this._settings;
    }

    public async init(): Promise<boolean> {
        const loaded = await app.databaseService.loadSettings();
        if ( !loaded) {
            return false;
        }
        this._settings = loaded;
        return true;
    }
}
