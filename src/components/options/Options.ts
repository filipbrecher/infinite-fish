import "./options.css";
import type {IComponent} from "../IComponent";
import {SavesPopup} from "./SavesPopup";
import {SettingsPopup} from "./SettingsPopup";
import {app} from "../../main";


// todo - button to clear all instances - maybe not here though?
export class Options implements IComponent {
    private readonly savesPopup: SavesPopup;
    private readonly settingsPopup: SettingsPopup;

    private readonly savesButton: HTMLDivElement;
    private readonly settingsButton: HTMLDivElement;

    constructor() {
        this.savesPopup = new SavesPopup();
        this.settingsPopup = new SettingsPopup();

        this.savesButton = document.getElementById("saves-button") as HTMLDivElement;
        this.settingsButton = document.getElementById("settings-button") as HTMLDivElement;

        this.savesButton.addEventListener("click", this.onClickSavesButton);
        this.settingsButton.addEventListener("click", this.onClickSettingsButton);
    }

    private onClickSavesButton = (event) => {
        event.stopPropagation();
        app.popup.open(null, this.savesPopup);
    }

    private onClickSettingsButton = (event) => {
        event.stopPropagation();
        app.popup.open(null, this.settingsPopup);
    }
}
