import {app} from "../main";
import type {SettingsProps} from "../types/db/schema";


// todo - allow to choose options for which mouse presses trigger which stuff (panning, zooming, dragging elements, deleting elemnts, ...)
//      - something like Ctrl (yes/no), Shift (yes/no), Button(left/middle/right - or for zooming wheel is forced) -> can choose ctrl and shift at once
//      - idea: select bg -> plain / grid (gridlines) / custom image ?? -> alghough how would panning and zooming work with that? probably fixed...
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
