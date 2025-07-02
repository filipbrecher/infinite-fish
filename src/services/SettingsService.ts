import {app} from "../main";
import type {SettingsProps} from "../types/db/schema";
import {Subject} from "../signals/Subject";
import {Utils} from "./Utils";
import {SETTINGS_KEY} from "../constants/dbSchema";
import {SETTINGS_CONFIG} from "../constants/settings";
import type {SettingsSection, SettingsSectionRow} from "../constants/settings";


// todo - make settings allow components to define their own settings ??? possibly in the future
export class SettingsService {
    private _settings: SettingsProps;
    public get settings() {
        return this._settings;
    }

    public readonly _changed: Subject<Partial<SettingsProps>> = new Subject();

    constructor() {
        this._settings = SettingsService.getDefaultSettings();
    }

    public async init(): Promise<void> {
        const settingsInDb = await app.database.loadSettings();
        this._settings = Utils.deepUpdate(this._settings, settingsInDb);

        document.body.dataset.theme = this._settings.general.theme;
        document.documentElement.style.setProperty("--separator-display", this._settings.general.showSeparator ? "block" : "none");
    }

    public static getDefaultSettings(): SettingsProps {
        let settings = {
            id: SETTINGS_KEY,
        }

        SETTINGS_CONFIG.forEach((section: SettingsSection) => {
            settings[section.key] = {};
            section.rows.forEach((row: SettingsSectionRow) => {
                settings[section.key][row.key] = row.content.default;
            });
        });

        return settings as SettingsProps;
    };

    public updateSettings(changes: Partial<SettingsProps>) {
        if (changes.general?.theme !== undefined) document.body.dataset.theme = changes.general.theme;
        if (changes.general?.showSeparator !== undefined) {
            document.documentElement.style.setProperty("--separator-display", changes.general.showSeparator ? "block" : "none");
        }

        this._settings = Utils.deepUpdate(this._settings, changes);
        this._changed.notify(changes);

        app.database.updateSettings(this._settings).catch();
    }
}
