import "./options.css";
import type {IComponent} from "../IComponent";
import {SavesPopup} from "./SavesPopup";
import {SettingsPopup} from "./SettingsPopup";
import type {IPopup} from "./IPopup";
import {app} from "../../main";
import {Sound} from "../../types/services";


// todo - button to clear all instances
export class Options implements IComponent {
    private readonly savesPopup: SavesPopup;
    private readonly settingsPopup: SettingsPopup;

    private openedPopup: IPopup | null = null;

    private readonly savesButton: HTMLDivElement;
    private readonly settingsButton: HTMLDivElement;

    private readonly overlay: HTMLDivElement;

    constructor() {
        this.savesPopup = new SavesPopup();
        this.settingsPopup = new SettingsPopup();

        this.savesButton = document.getElementById("saves-button") as HTMLDivElement;
        this.settingsButton = document.getElementById("settings-button") as HTMLDivElement;
        this.overlay = document.getElementById("options-overlay") as HTMLDivElement;

        this.overlay.addEventListener("click", this.closePopup);
        this.savesButton.addEventListener("click", this.onClickSavesButton);
        this.settingsButton.addEventListener("click", this.onClickSettingsButton);
    }

    private onClickSavesButton = (event) => {
        if (this.openedPopup) return;
        event.stopPropagation();
        this.openedPopup = this.savesPopup;

        this.openedPopup.open();
        this.overlay.classList.add("visible");
        app.audio.play(Sound.OPEN_POPUP);
    }

    private onClickSettingsButton = (event) => {
        if (this.openedPopup) return;
        event.stopPropagation();
        this.openedPopup = this.settingsPopup;

        this.openedPopup.open();
        this.overlay.classList.add("visible");
        app.audio.play(Sound.OPEN_POPUP);
    }

    private closePopup = (event) => {
        if (event.target.id !== "options-overlay") return;
        if ( !this.openedPopup) return;

        this.openedPopup.close();
        this.openedPopup = null;
        this.overlay.classList.remove("visible");
        event.stopPropagation();
    }
}
