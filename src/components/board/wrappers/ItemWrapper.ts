import {ElementView} from "../views/ElementView";
import {View} from "../views/View";


export class ItemWrapper {
    private readonly _view: ElementView;
    private _div: HTMLDivElement | undefined;

    constructor(view: ElementView) {
        this._view = view;
    }

    public getDiv(): HTMLDivElement {
        this._div = document.createElement("div");

        this._div.classList.add("wrapper");
        this._div.classList.add("item-wrapper");

        return this._div;
    }

    public getView(): View {
        return this._view;
    }

    public removeDiv() {
        this._div?.remove();
    }
}
