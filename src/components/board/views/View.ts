import type {ViewDataProps} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";


export abstract class View {
    protected _div: HTMLDivElement;

    public measureUnscaledSize(): [ number, number ] {
        this._div.style.position = 'absolute';
        this._div.style.visibility = 'hidden';
        this._div.style.pointerEvents = 'none';
        this._div.style.left = '-9999px';
        document.body.appendChild(this._div);

        const width = this._div.offsetWidth;
        const height = this._div.offsetHeight;
        this._div.remove();

        return [width, height];
    }

    public canCombine(): boolean {
        return false;
    }
    public setCombining(combining: boolean) {}
    public setHide(hide: boolean) {}
    public setDiscovery(discovery: boolean) {}

    abstract mountTo(container: HTMLDivElement): void;
    abstract type(): ViewTypeProps;
    abstract data(): ViewDataProps;
}
