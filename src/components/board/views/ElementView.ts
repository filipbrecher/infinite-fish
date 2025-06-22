import type {ElementViewData, ViewDataProps, ElementProps} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {app} from "../../../main";


abstract class View {}

// todo - add hidden?
export class ElementView extends View {
    private readonly _elementId: number;
    public get id() { return this._elementId; }
    private readonly _emoji: string;
    private readonly _text: string;
    public get text() { return this._text; }
    private _discovery: boolean;
    private _combining: boolean = false; // when combining two elements

    private div: HTMLDivElement | undefined;

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
        } else {
            this._elementId = elementData.id;
            this._emoji = elementData.emoji;
            this._text = elementData.text;
            this._discovery = elementData.discovery || false;
        }
    }

    public canCombine(): boolean {
        return !this._combining;
    }

    public setCombining(combining: boolean) {
        this._combining = combining;
        this.div?.classList.toggle("combining", combining);
    }

    public getDiv(): HTMLDivElement {
        if (this.div) return this.div;
        this.div = document.createElement("div");
        this.div.classList.add("view");
        this.div.classList.add("element-view");
        if (this._discovery) this.div.classList.add("discovery");
        this.div.innerText = `${this._emoji} ${this._text}`;
        return this.div;
    }

    public type(): ViewTypeProps {
        return ViewTypeProps.Element;
    }

    public data(): ViewDataProps {
        return this._elementId;
    }
}
