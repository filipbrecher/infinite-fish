import {app} from "../main";
import type {Settings} from "../types/dbSchema";


export class SettingsService {
    private _settings: Settings;
    public get settings() {
        return this._settings;
    }

    public async init(): Promise<void> {
        this._settings = await app.databaseService.loadSettings();
    }
}
