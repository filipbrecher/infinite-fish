import type {InstanceProps} from "../../../types/dbSchema";
import {InstanceTypeProps} from "../../../types/dbSchema";
import {View} from "./View";


// todo - if id not found, do not render
//      - if ghost, create a hook
export class Instance {
    private readonly instanceId: number;
    private x: number;
    private y: number;

    private height: number | undefined;
    private width: number | undefined;

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

    public isInBox(x1: number, y1: number, x2: number, y2: number): boolean {
        if ( !this.height || !this.width) {
            this.height = this.div!.offsetHeight;
            this.width = this.div!.offsetWidth;
        }
        return (
            this.x < x2 &&
            this.x + this.width > x1 &&
            this.y < y2 &&
            this.y + this.height > y1
        );
    }

    public removeDiv() {
        this.div?.remove();
    }

    public setSelected(selected: boolean) {
        this.selected = selected;
        this.div?.classList.toggle("selected", selected);
    }

    public updateCoordinates(offsetX: number, offsetY: number) {
        this.x += offsetX;
        this.y += offsetY;
        this.div!.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    public moveDivTo(dest: HTMLDivElement) {
        dest.appendChild(this.div);
    }
}
