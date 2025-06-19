import type {ElementViewData, ElementProps} from "../../../types/dbSchema";
import type {ViewDataProps} from "../../../types/dbSchema";
import {ViewTypeProps} from "../../../types/dbSchema";
import {app} from "../../../main";


abstract class View {}

// todo - add hidden?
export class ElementView extends View {
    private readonly elementId: number;
    private readonly emoji: string;
    private readonly text: string;
    private discovery: boolean;
    private disabled: boolean = false; // when combining two elements

    private div: HTMLDivElement | undefined;

    constructor(elementData: ElementViewData | ElementProps) {
        super();

        if (typeof elementData === "number") {
            const element = app.state.elementsById[elementData];
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

    public canCombine(): boolean {
        return !this.disabled;
    }

    public getDiv(): HTMLDivElement {
        if (this.div) return this.div;
        const div = document.createElement("div");
        div.classList.add("view");
        div.classList.add("element-view");
        if (this.discovery) div.classList.add("discovery");
        div.innerText = `${this.emoji} ${this.text}`;
        return div;
    }

    public type(): ViewTypeProps {
        return ViewTypeProps.Element;
    }

    public data(): ViewDataProps {
        return this.elementId;
    }
}
