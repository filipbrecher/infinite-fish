import {app} from "../main";
import type {Save} from "../types/dbSchema";


export class Options {
    private readonly savesButton: HTMLDivElement;
    private readonly savesPopup: HTMLDivElement;
    private readonly savesImportButton: HTMLDivElement;
    private readonly savesCreateButton: HTMLDivElement;
    private readonly savesList: HTMLDivElement;

    private readonly settingsButton: HTMLDivElement;
    private readonly settingsPopup: HTMLDivElement;

    private readonly overlay: HTMLDivElement;

    private popupOpen: boolean = false;

    constructor() {
        this.savesButton = <HTMLDivElement>document.getElementById("saves-button");
        this.savesPopup = <HTMLDivElement>document.getElementById("saves-popup");
        this.savesImportButton = <HTMLDivElement>document.getElementById("saves-import");
        this.savesCreateButton = <HTMLDivElement>document.getElementById("saves-create");
        this.savesList = <HTMLDivElement>document.getElementById("saves-list");
        this.settingsButton = <HTMLDivElement>document.getElementById("settings-button");
        this.settingsPopup = <HTMLDivElement>document.getElementById("settings-popup");
        this.overlay = <HTMLDivElement>document.getElementById("overlay");

        this.savesButton.addEventListener("click", this.onMouseDownSavesButton);
        this.savesImportButton.addEventListener("click", this.onMouseDownImportButton);
        this.savesCreateButton.addEventListener("click", this.onMouseDownCreateButton);
        this.settingsButton.addEventListener("click", this.onMousedownSettingsButton);
    }

    private onMouseDownSavesButton = (event) => {
        if (this.popupOpen) return;
        this.popupOpen = true;

        document.addEventListener("mousedown", this.closePopup);

        this.savesList.innerHTML = "";
        app.savesService.getSortedSaves().reverse().forEach((save) => {
            this.prependSave(save);
        });
        this.savesPopup.style.display = "flex";
        this.overlay.style.display = "block";
        event.stopPropagation();
    }

    private prependSave(save: Save) {
        const div = app.savesService.saveToDiv(save);
        const deleteIcon = <HTMLInputElement>div.querySelector(".delete-icon");
        deleteIcon.addEventListener("click", this.onMouseDownDeleteButton);
        this.savesList.prepend(div);
    }

    private onMouseDownImportButton = (event) => {
        console.log("clicked onMouseDownImportButton");
        // todo
    }

    private onMouseDownCreateButton = async (event) => {
        const newSave = await app.savesService.createNewSave();
        this.prependSave(newSave);
    }

    private onMouseDownDeleteButton = async (event) => {
        if ( !window.confirm("Are you sure you want to delete this save? This action is irreversible.")) return;

        const id = Number(event.target.parentElement.id.slice(13));
        const saveDiv = document.getElementById(`save-${id}`);
        if ( await app.savesService.deleteSave(id)) {
            saveDiv.remove();
        }
    }

    private onMousedownSettingsButton = (event) => {
        if (this.popupOpen) return;
        this.popupOpen = true;

        document.addEventListener("mousedown", this.closePopup);
        this.settingsPopup.style.display = "flex";
        this.overlay.style.display = "block";
        event.stopPropagation();
    }

    private closePopup = (event) => {
        if (event.target.id !== "overlay") return;
        if ( !this.popupOpen) return;
        this.popupOpen = false;

        document.removeEventListener("mousedown", this.closePopup);
        this.settingsPopup.style.display = "none";
        this.savesPopup.style.display = "none";
        this.overlay.style.display = "none";
        event.stopPropagation();
    }
}
