import type {ElementInstanceData} from "../../../types/dbSchema";
import {app} from "../../../main";


abstract class View {}

export class ElementView extends View {
    private readonly elementId: number;
    private readonly emoji: string;
    private readonly text: string;
    private discovery: boolean;

    private div: HTMLDivElement | undefined;

    constructor(elementId: ElementInstanceData) {
        super();
        const element = app.state.elements.get(elementId);
        if ( !element) {

        }
        this.elementId = elementId;
        this.emoji = element.emoji;
        this.text = element.text;
        this.discovery = element.discovery || false;
    }

    public getDiv(): HTMLDivElement | undefined {
        if (this.div) return this.div;
        const div = document.createElement("div");
        div.classList.add("view");
        div.classList.add("element-view");
        div.innerText = `${this.emoji} ${this.text} ${this.discovery ? "discovery" : ""}`;
        return div;
    }
}
