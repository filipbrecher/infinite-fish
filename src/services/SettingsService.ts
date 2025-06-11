import {app} from "../main";
import type {Settings} from "../types/dbSchema";


// todo - allow to choose options for which mouse presses trigger which stuff (panning, zooming, dragging elements, deleting elemnts, ...)
//      - something like Ctrl (yes/no), Shift (yes/no), Button(left/middle/right - or for zooming wheel is forced) -> can choose ctrl and shift at once
//      - idea: select bg -> plain / grid (gridlines) / custom image ?? -> alghough how would panning and zooming work with that? probably fixed...
export class SettingsService {
    private _settings: Settings;
    public get settings() {
        return this._settings;
    }

    public async init(): Promise<void> {
        this._settings = await app.database.loadSettings();
    }
}
