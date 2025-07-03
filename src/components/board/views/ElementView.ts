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
                app.logger.log("error", "view", `Failed to create ElementView: Element with id ${elementData} not found`);
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

        if (this._emoji && this._emoji.length !== 0) {
            const emojiSpan = document.createElement("span");
            emojiSpan.classList.add("emoji");
            emojiSpan.innerText = this._emoji;
            const separatorSpan = document.createElement("span");
            separatorSpan.classList.add("separator");
            this._div.append(emojiSpan, separatorSpan);
        }

        const textSpan = document.createElement("span");
        textSpan.classList.add("text");
        textSpan.innerText = this._text;
        this._div.appendChild(textSpan);

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

    public type(): ViewTypeProps {
        return ViewTypeProps.Element;
    }

    public data(): ViewDataProps {
        return this._elementId;
    }
}
