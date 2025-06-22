import type {IPopup} from "./IPopup";


// todo - the option to allow Nothing to be generated -> with a disclaimer that it can break lineages containing it in infinibrowser
export class SettingsPopup implements IPopup {
    private readonly popup: HTMLDivElement;

    constructor() {
        this.popup = document.getElementById("settings-popup") as HTMLDivElement;
    }

    public open = () => {
        this.popup.style.display = "flex";
    }

    public close = () => {
        this.popup.style.display = "none";
    }
}