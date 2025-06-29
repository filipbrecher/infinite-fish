import {ElementView} from "../views/ElementView";
import {Wrapper} from "./Wrapper";
import type {ElementProps} from "../../../types/db/schema";
import {app} from "../../../main";
import {ViewTypeProps} from "../../../types/db/schema";


export class SidebarItemWrapper extends Wrapper {
    private readonly _view: ElementView;
    private readonly _div: HTMLDivElement | undefined;

    constructor(props: ElementProps) {
        super();
        this._view = new ElementView(props);
        this._div = document.createElement("div");

        this._div.classList.add("wrapper");
        this._div.classList.add("sidebar-item-wrapper");
        this._div.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("sidebar-item", e)(e, props);
        });
        this._div.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("board-spawn-instance", e)(e, ViewTypeProps.Element, props.id);
        });

        this._view.mountTo(this._div);
    }

    public insertBefore(container: HTMLDivElement, nextSibling: Node | null) {
        container.insertBefore(this._div, nextSibling);
    }

    public removeDiv() {
        this._div?.remove();
    }

    public setElementDiscovery(discovery: boolean) {
        this._view.setDiscovery(discovery);
    }

    public setElementHide(hide: boolean) {
        this._view.setHide(hide);
    }
}
