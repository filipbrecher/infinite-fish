import "./options.css";
import type {IComponent} from "../IComponent";
import {SavesPopup} from "./SavesPopup";
import {SettingsPopup} from "./SettingsPopup";
import type {IPopup} from "./IPopup";


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

        this.savesButton = <HTMLDivElement>document.getElementById("saves-button");
        this.settingsButton = <HTMLDivElement>document.getElementById("settings-button");
        this.overlay = <HTMLDivElement>document.getElementById("options-overlay");

        this.overlay.addEventListener("click", this.closePopup);
        this.savesButton.addEventListener("click", this.onClickSavesButton);
        this.settingsButton.addEventListener("click", this.onClickSettingsButton);
    }

    private onClickSavesButton = (event) => {
        if (this.openedPopup) return;
        this.openedPopup = this.savesPopup;

        this.openedPopup.open();
        this.overlay.classList.add("visible");
        event.stopPropagation();
    }

    private onClickSettingsButton = (event) => {
        if (this.openedPopup) return;
        this.openedPopup = this.settingsPopup;

        this.openedPopup.open();
        this.overlay.classList.add("visible");
        event.stopPropagation();
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
