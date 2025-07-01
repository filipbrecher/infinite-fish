import "../styles/popup.css";
import {Popup} from "../components/popups/Popup";
import {app} from "../main";
import {Sound} from "../types/services";
import {Subject} from "../signals/Subject";


export class PopupService {
    private readonly wrapper: HTMLDivElement;
    private readonly overlay: HTMLDivElement;
    private stack: {opener: any, popup: Popup<any>}[] = [];

    private hidden: boolean = false;
    private hider: any; // object that hid the popup and only that subject can show it again

    public _openedPopup: Subject<void> = new Subject();
    public _closedPopup: Subject<void> = new Subject();

    constructor() {
        this.wrapper = document.getElementById("popups-wrapper") as HTMLDivElement;
        this.overlay = document.getElementById("popups-overlay") as HTMLDivElement;
        this.overlay.addEventListener("click", this.onCloseTop);
    }

    public open<T, U>(opener: Popup<U> | any, popup: Popup<T>, props?: T): boolean {
        if ( !this.canOpen(opener)) return false;

        this.overlay.classList.toggle("visible", true);
        this.stack.push({opener: opener, popup: popup});

        this.wrapper.appendChild(popup.popup);
        this.updateOverlay();
        popup.open(props);
        app.audio.play(Sound.OPEN_POPUP);

        if (this.stack.length === 1) this._openedPopup.notify();

        return true;
    }

    private canOpen<T>(opener: Popup<T> | any) {
        if (this.stack.length === 0) return true;
        return this.stack[this.stack.length - 1].popup === opener;
    }

    public close<T>(popupOrOpener: Popup<T> | any): boolean {
        const id = this.stack.findIndex(p => p.popup === popupOrOpener || p.opener === popupOrOpener);
        if (id === -1) return false;

        while (this.stack.length > id) {
            const top = this.stack.pop();
            top.popup.close();
        }

        this.overlay.classList.toggle("visible", false);
        this.updateOverlay();

        if (this.stack.length === 0) this._closedPopup.notify();

        return true;
    }

    private onCloseTop = (event: MouseEvent) => {
        if (this.stack.length === 0) return;
        this.close(this.stack[this.stack.length - 1].popup);
        event.stopPropagation();
    }

    private updateOverlay() {
        if (this.stack.length === 0) return;
        const top = this.stack[this.stack.length - 1];
        this.wrapper.insertBefore(this.overlay, top.popup.popup);
    }

    public hide(hider: any): boolean {
        if (this.hidden || this.stack.length === 0) return false;
        this.hider = hider;
        this.hidden = true;
        this.wrapper.classList.toggle("visible", false);
        return true;
    }

    public show(hider: any): boolean {
        if ( !this.hidden || this.hider !== hider) return false;
        this.hidden = false;
        this.wrapper.classList.toggle("visible", true);
        return true;
    }
}
