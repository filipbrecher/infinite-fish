import {Wrapper} from "./Wrapper";
import type {ElementViewData, GhostElementViewData} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {app} from "../../../main";
import {createView} from "../views/ViewFactory";
import {View} from "../views/View";


export class ItemWrapper extends Wrapper {
    private readonly _view: View;
    private readonly _div: HTMLDivElement | undefined;

    constructor(type: ViewTypeProps, props: ElementViewData | GhostElementViewData) {
        super();
        this._view = createView(type, props);
        this._div = document.createElement("div");

        this._div.classList.add("wrapper");
        this._div.classList.add("item-wrapper");
        this._div.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("board-spawn-instance", e)(e, type, props);
        });

        this._view.mountTo(this._div);
    }

    public insertBefore(container: HTMLDivElement, nextSibling: Node | null) {
        container.insertBefore(this._div, nextSibling);
    }

    public removeDiv() {
        this._div?.remove();
    }
}
