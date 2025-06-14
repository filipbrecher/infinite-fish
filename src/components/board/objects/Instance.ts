import type {InstanceProps} from "../../../types/dbSchema";
import {InstanceTypeProps} from "../../../types/dbSchema";
import {View} from "./View";


// todo - if id not found, do not render
//      - if ghost, create a hook
export class Instance {
    private readonly instanceId: number;
    private x: number;
    private y: number;

    private height: number;
    private width: number;

    private selected: boolean;

    private div: HTMLDivElement | undefined;

    constructor(props: InstanceProps) {
        this.instanceId = props.id;
        this.x = props.x;
        this.y = props.y;
    }

    public getDiv(): HTMLDivElement {
        this.div = document.createElement("div");

        this.div.id = `instance-${this.instanceId}`;
        this.div.classList.add("instance-wrapper");
        this.div.style.transform = `translate(${this.x}px, ${this.y}px)`;

        return this.div;
    }

    public calculateSize() {
        this.height = this.div!.offsetHeight;
        this.width = this.div!.offsetWidth;
    }

    public removeDiv() {
        this.div?.remove();
    }

    public setSelected(selected: boolean) {
        this.selected = selected;
        this.div?.classList.toggle("selected", selected);
    }

    public moveDivTo(dest: HTMLDivElement) {
        dest.appendChild(this.div);
    }
}
