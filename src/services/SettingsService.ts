import {app} from "../main";
import type {SettingsProps} from "../types/db/schema";


// todo - make settings allow components to define their own settings ??? possibly -> in the future
export class SettingsService {
    private _settings: SettingsProps;
    public get settings() {
        return this._settings;
    }

    public async init(): Promise<void> {
        this._settings = await app.database.loadSettings();
        document.body.dataset.theme = this._settings.theme;
        document.body.dataset.theme = "light"; // todo - temporary
    }
}
