import "./options.css";
import type {IComponent} from "../IComponent";
import {SavesPopup} from "./SavesPopup";
import {SettingsPopup} from "./SettingsPopup";
import {app} from "../../main";


// todo - button to clear all instances - maybe not here though?
export class Options implements IComponent {
    private readonly settingsPopup: SettingsPopup;
    private readonly savesPopup: SavesPopup;

    private readonly settingsButton: HTMLDivElement;
    private readonly savesButton: HTMLDivElement;

    constructor() {
        this.settingsPopup = new SettingsPopup();
        this.savesPopup = new SavesPopup();

        this.settingsButton = document.getElementById("options-settings-icon") as HTMLDivElement;
        this.savesButton = document.getElementById("options-saves-icon") as HTMLDivElement;

        this.settingsButton.addEventListener("click", this.onClickSettingsButton);
        this.savesButton.addEventListener("click", this.onClickSavesButton);
    }

    private onClickSettingsButton = (event) => {
        event.stopPropagation();
        app.popup.open(this, this.settingsPopup);
    }

    private onClickSavesButton = (event) => {
        event.stopPropagation();
        app.popup.open(this, this.savesPopup);
    }
}
