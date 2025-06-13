import type {InstanceProps} from "../../../types/dbSchema";
import {InstanceTypeProps} from "../../../types/dbSchema";
import {View} from "./View";


// todo - if id not found, do not render
//      - if ghost, create a hook
export class Instance {
    private readonly instanceId: number;
    private x: number;
    private y: number;
    private view: View;

    private height: number;
    private width: number;

    private selected: boolean;

    private div: HTMLDivElement | undefined;

    constructor(props: InstanceProps) {
        this.instanceId = props.id;
        this.x = props.x;
        this.y = props.y;
        this.view = View.getView(props.type || InstanceTypeProps.Element, props.data);
    }

    public getDiv(): HTMLDivElement | undefined {
        const viewDiv = this.view.getDiv();
        if ( !viewDiv) return undefined;

        const div = document.createElement("div");
        div.id = `instance-${this.instanceId}`;
        div.classList.add("instance-wrapper");
        div.style.transform = `translate(${this.x}px, ${this.y}px)`;
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
