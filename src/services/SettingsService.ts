import {app} from "../main";
import type {SettingsProps} from "../types/db/schema";
import {Subject} from "../signals/Subject";
import {Utils} from "./Utils";


// todo - make settings allow components to define their own settings ??? possibly in the future
export class SettingsService {
    private _settings: SettingsProps;
    public get settings() {
        return this._settings;
    }

    public readonly _changed: Subject<Partial<SettingsProps>> = new Subject();

    public async init(): Promise<void> {
        this._settings = await app.database.loadSettings();
        document.body.dataset.theme = this._settings.theme;
        document.documentElement.style.setProperty("--separator-display", this._settings.showEmojiTextSeparator ? "block" : "none");
    }

    public updateSettings(changes: Partial<SettingsProps>) {
        if (changes.theme !== undefined) document.body.dataset.theme = changes.theme;
        if (changes.showEmojiTextSeparator !== undefined) {
            document.documentElement.style.setProperty("--separator-display", changes.showEmojiTextSeparator ? "block" : "none");
        }

        this._settings = Utils.deepUpdate(this._settings, changes);
        this._changed.notify(changes);

        app.database.updateSettings(this._settings).catch();
    }
}
