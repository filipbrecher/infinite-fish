import type {ElementProps, ViewDataProps} from "../../../types/db/schema";


export class Item {
    private readonly elementId: number;
    private readonly emoji: string;
    private readonly text: string;
    private div: HTMLDivElement | undefined;

    constructor(props: ElementProps) {
        this.elementId = props.id;
        this.emoji = props.emoji;
        this.text = props.text;
    }

    public getDiv(): HTMLDivElement {
        if (this.div) return this.div;
        this.div = document.createElement("div");
        this.div.classList.add("item");
        this.div.innerText = `${this.emoji} ${this.text}`;
        return this.div;
    }

    public removeDiv() {
        this.div?.remove();
    }

    public getElementId(): ViewDataProps {
        return this.elementId;
    }
}
