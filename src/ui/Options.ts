

export class Options {
    private readonly savesButton: HTMLDivElement;
    private readonly savesPopup: HTMLDivElement;
    private readonly settingsButton: HTMLDivElement;
    private readonly settingsPopup: HTMLDivElement;
    private readonly overlay: HTMLDivElement;

    private popupOpen: boolean = false;

    constructor() {
        this.savesButton = <HTMLDivElement>document.getElementById("saves-button");
        this.savesPopup = <HTMLDivElement>document.getElementById("saves-popup");
        this.settingsButton = <HTMLDivElement>document.getElementById("settings-button");
        this.settingsPopup = <HTMLDivElement>document.getElementById("settings-popup");
        this.overlay = <HTMLDivElement>document.getElementById("overlay");

        this.savesButton.addEventListener("mousedown", this.onMouseDownSavesButton);
        this.settingsButton.addEventListener("mousedown", this.onMousedownSettingsButton);
    }

    private onMouseDownSavesButton = (event) => {
        if (this.popupOpen) return;
        this.popupOpen = true;

        document.addEventListener("mousedown", this.closePopup);
        this.savesPopup.style.display = "block";
        this.overlay.style.display = "block";
        event.stopPropagation();
        console.log("onMouseDownSavesButton");
    }

    private onMousedownSettingsButton = (event) => {
        if (this.popupOpen) return;
        this.popupOpen = true;

        document.addEventListener("mousedown", this.closePopup);
        this.settingsPopup.style.display = "block";
        this.overlay.style.display = "block";
        event.stopPropagation();
        console.log("onMousedownSettingsButton");
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
