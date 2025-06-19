import type {InstanceMoveProps, InstanceProps, NewInstanceProps} from "../../../types/dbSchema";
import {View} from "./View";


// todo - if ghost, create a hook
export class InstanceWrapper {
    private readonly workspaceId: number;
    private readonly instanceId: number;
    private x: number;
    private y: number;
    private zIndex: number;

    private height: number | undefined;
    private width: number | undefined;

    private selected: boolean;

    private view: View;
    private div: HTMLDivElement | undefined;

    constructor(props: InstanceProps, view: View) {
        this.workspaceId = props.workspaceId;
        this.instanceId = props.id;
        this.x = props.x;
        this.y = props.y;
        this.zIndex = props.zIndex;
        this.view = view;
    }

    public getZIndex(): number {
        return this.zIndex;
    }

    public getDiv(): HTMLDivElement {
        this.div = document.createElement("div");

        this.div.id = `instance-${this.instanceId}`;
        this.div.classList.add("instance-wrapper");
        this.div.style.zIndex = `${this.zIndex}`;
        this.div.style.transform = `translate(${this.x}px, ${this.y}px)`;

        return this.div;
    }

    public getMoveProps(): InstanceMoveProps {
        return {
            workspaceId: this.workspaceId,
            id: this.instanceId,
            x: this.x,
            y: this.y,
            zIndex: this.zIndex,
        };
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

    public updatePosition(offsetX: number, offsetY: number, zIndex: number) {
        this.x += offsetX;
        this.y += offsetY;
        this.zIndex = zIndex;
        this.div!.style.zIndex = `${this.zIndex}`;
        this.div!.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    public moveDivTo(dest: HTMLDivElement) {
        dest.appendChild(this.div);
    }

    public getDuplicate(dragOffsetX: number, dragOffsetY: number, zIndex?: number): NewInstanceProps {
        return {
            x: this.x + dragOffsetX,
            y: this.y + dragOffsetY,
            zIndex: zIndex ? zIndex : this.zIndex,
            type: this.view.type(),
            data: this.view.data(),
        }
    }
}
