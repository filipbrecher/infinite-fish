import "../styles/popup.css";
import {Popup} from "../components/popups/Popup";
import {app} from "../main";
import {Sound} from "../types/services";


export class PopupService {
    private readonly wrapper: HTMLDivElement;
    private readonly overlay: HTMLDivElement;
    private stack: Popup<any>[] = [];

    constructor() {
        this.wrapper = document.getElementById("popups-wrapper") as HTMLDivElement;
        this.overlay = document.getElementById("popups-overlay") as HTMLDivElement;
        this.overlay.addEventListener("click", this.onCloseTop);
    }

    public open<T, U>(opener: Popup<U> | null = null, popup: Popup<T>, props?: T): boolean {
        if ( !this.canOpen<U>(opener)) return false;

        this.overlay.classList.toggle("visible", true);
        this.stack.push(popup);

        this.wrapper.appendChild(popup.popup);
        this.updateOverlay();
        popup.open(props);
        app.audio.play(Sound.OPEN_POPUP);

        return true;
    }

    private canOpen<T>(opener: Popup<T> | null) {
        if (this.stack.length === 0) return true;
        return this.stack[this.stack.length - 1] === opener;
    }

    public close<T>(popup: Popup<T>): boolean {
        const id = this.stack.findIndex(p => p === popup);
        if (id === -1) return false;

        while (this.stack.length > id) {
            const top = this.stack.pop();
            top.close();
        }

        this.overlay.classList.toggle("visible", false);
        this.updateOverlay();
        return true;
    }

    private onCloseTop = (event: MouseEvent) => {
        if (this.stack.length === 0) return;
        this.close(this.stack[this.stack.length - 1]);
        event.stopPropagation();
    }

    private updateOverlay() {
        if (this.stack.length === 0) return;
        const top = this.stack[this.stack.length - 1];
        this.wrapper.insertBefore(this.overlay, top.popup);
    }
}
