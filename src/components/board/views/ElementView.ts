import type {ElementViewData, ViewDataProps, ElementProps} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {app} from "../../../main";
import {View} from "./View";


export class ElementView extends View {
    private readonly _elementId: number;
    public get id() { return this._elementId; }
    private readonly _emoji: string;
    private readonly _text: string;
    public get text() { return this._text; }
    private _discovery: boolean;
    private _hide: boolean;
    private _combining: boolean = false; // when combining two elements

    constructor(elementData: ElementViewData | ElementProps) {
        super();

        if (typeof elementData === "number") {
            const element = app.state.elementsById[elementData];
            if ( !element) {
                app.logger.log("error", "element-view", `Failed to create ElementView: Element with id ${elementData} not found`);
                throw new Error("");
            }
            this._elementId = elementData;
            this._emoji = element.emoji;
            this._text = element.text;
            this._discovery = element.discovery || false;
            this._hide = element.hide || false;
        } else {
            this._elementId = elementData.id;
            this._emoji = elementData.emoji;
            this._text = elementData.text;
            this._discovery = elementData.discovery || false;
            this._hide = elementData.hide || false;
        }

        this._div = document.createElement("div");

        this._div.classList.add("view");
        this._div.classList.add("element-view");
        if (this._discovery) this._div.classList.add("discovery");
        if (this._hide) this._div.classList.add("hide");

        const span = document.createElement("span");
        span.classList.add("emoji");
        span.innerText = this._emoji;
        const textNode = document.createTextNode(" " + this._text);

        this._div.append(span, textNode);

        this._div.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("element-view", e)(e, this._elementId);
        });
    }

    public canCombine(): boolean {
        return !this._combining;
    }

    public setDiscovery(discovery: boolean) {
        this._discovery = discovery;
        this._div.classList.toggle("discovery", discovery);
    }

    public setHide(hide: boolean) {
        this._hide = hide;
        this._div.classList.toggle("hide", hide);
    }

    public setCombining(combining: boolean) {
        this._combining = combining;
        this._div.classList.toggle("combining", combining);
    }

    protected mountTo(container: HTMLDivElement): void {
        container.appendChild(this._div);
    }

    public type(): ViewTypeProps {
        return ViewTypeProps.Element;
    }

    public data(): ViewDataProps {
        return this._elementId;
    }
}
