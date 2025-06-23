import {ElementView} from "../views/ElementView";
import {View} from "../views/View";
import {Wrapper} from "./Wrapper";


export class ItemWrapper extends Wrapper {
    private readonly _view: ElementView;
    private _div: HTMLDivElement | undefined;

    constructor(view: ElementView) {
        super();
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
