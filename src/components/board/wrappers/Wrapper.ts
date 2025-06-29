import {View} from "../views/View";
import {createView} from "../views/ViewFactory";
import type {ViewDataProps, ViewTypeProps} from "../../../types/db/schema";


// todo - if ghost, create a hook ?
export abstract class Wrapper {
    protected readonly _view: View;
    protected readonly _div: HTMLDivElement;

    protected _disabled: boolean = false;
    public get disabled() { return this._disabled; }

    protected constructor(type: ViewTypeProps, data: ViewDataProps) {
        this._view = createView(type, data);

        this._div = document.createElement("div");
        this._div.classList.add("wrapper");

        this._view.mountTo(this._div);
    }

    public setDisabled(disabled: boolean) {
        this._disabled = disabled;
        this._div?.classList.toggle("disabled", disabled);
    }

    public mountTo(container: HTMLDivElement) {
        container.appendChild(this._div);
    }
}
