import {Wrapper} from "./Wrapper";
import type {ElementViewData, GhostElementViewData} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {app} from "../../../main";


export class ItemWrapper extends Wrapper {

    constructor(type: ViewTypeProps, data: ElementViewData | GhostElementViewData) {
        super(type, data);

        this._div.classList.add("item-wrapper");
        this._div.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("board-spawn-instance", e)(e, type, data);
        });
    }

    public insertBefore(container: HTMLDivElement, nextSibling: Node | null) {
        container.insertBefore(this._div, nextSibling);
    }

    public removeDiv() {
        this._div?.remove();
    }
}
