import {ElementView} from "../views/ElementView";
import {Wrapper} from "./Wrapper";
import {View} from "../views/View";


export class ItemWrapper extends Wrapper {
    private readonly _view: ElementView;
    private _div: HTMLDivElement | undefined;

    constructor(view: ElementView) {
        super();
        this._view = view;
    }

    public getDiv(viewDiv: HTMLDivElement): HTMLDivElement {
        this._div = document.createElement("div");

        this._div.classList.add("wrapper");
        this._div.classList.add("item-wrapper");

        this._div.appendChild(viewDiv);

        return this._div;
    }

    public getView(): View {
        return this._view as View;
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
