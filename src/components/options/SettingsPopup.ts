import type {IPopup} from "./IPopup";


export class SettingsPopup implements IPopup {
    private readonly popup: HTMLDivElement;

    constructor() {
        this.popup = <HTMLDivElement>document.getElementById("settings-popup");
    }

    public open = () => {
        this.popup.style.display = "flex";
    }

    public close = () => {
        this.popup.style.display = "none";
    }
}