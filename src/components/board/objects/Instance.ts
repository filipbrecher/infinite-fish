import type {InstanceDataProps, InstanceProps} from "../../../types/dbSchema";
import {InstanceTypeProps} from "../../../types/dbSchema";
import {View} from "./View";


// todo - if id not found, do not render
//      - if ghost, create a hook
export class Instance {
    private readonly id: number;
    private x: number;
    private y: number;
    private readonly type: InstanceTypeProps;
    private readonly data: InstanceDataProps;

    private height: number;
    private width: number;

    private discovered: boolean;
    private ghost: boolean;         // element not present (instead of being identified by elementId, it is by its text) -> has a hook on it being crafted
    private selected: boolean;

    private div: HTMLDivElement | undefined;

    constructor(props: InstanceProps) {
        this.id = props.id;
        this.x = props.x;
        this.y = props.y;
        this.type = props.type || InstanceTypeProps.Element;
        this.data = props.data;
    }

    public getDiv(): HTMLDivElement | undefined {
        const div = document.createElement("div");
        div.id = `instance-${this.id}`;
        div.classList.add("instance-wrapper");
        div.style.transform = `translate(${this.x}px, ${this.y}px)`;

        const viewDiv = View.getDiv(this.type, this.data);
        if ( !viewDiv) return undefined;
        div.appendChild(viewDiv);

        this.div = div;
        return div;
    }

    public calculateSize() {
        this.height = this.div!.offsetHeight;
        this.width = this.div!.offsetWidth;
    }

    public removeDiv() {
        this.div?.remove();
    }
}
