import type {ElementInstanceData, ElementProps} from "../../../types/dbSchema";
import {app} from "../../../main";


abstract class View {}

// todo - add hidden?
export class ElementView extends View {
    private readonly elementId: number;
    private readonly emoji: string;
    private readonly text: string;
    private discovery: boolean;

    private div: HTMLDivElement | undefined;

    constructor(elementData: ElementInstanceData | ElementProps) {
        super();

        if (typeof elementData === "number") {
            const element = app.state.elements.get(elementData);
            if ( !element) {
                app.logger.log("error", "element-view", `Failed to create ElementView: Element with id ${elementData} not found`);
                throw new Error("");
            }
            this.elementId = elementData;
            this.emoji = element.emoji;
            this.text = element.text;
            this.discovery = element.discovery || false;
        } else {
            this.elementId = elementData.id;
            this.emoji = elementData.emoji;
            this.text = elementData.text;
            this.discovery = elementData.discovery || false;
        }
    }

    public getDiv(): HTMLDivElement {
        if (this.div) return this.div;
        const div = document.createElement("div");
        div.classList.add("view");
        div.classList.add("element-view");
        div.innerText = `${this.emoji} ${this.text} ${this.discovery ? "discovery" : ""}`;
        return div;
    }
}
