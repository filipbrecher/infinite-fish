import type {InstanceProps} from "../../../types/db/schema";
import type {InstanceMoveProps, NewInstanceProps} from "../../../types/db/dto";
import {View} from "./View";


// todo - if ghost, create a hook
export class InstanceWrapper {
    private readonly _workspaceId: number;
    private readonly _instanceId: number;
    public get id() { return this._instanceId; }
    private _x: number;
    private _y: number;
    private _zIndex: number;
    public get zIndex() { return this._zIndex; }

    private _height: number | undefined;
    private _width: number | undefined;

    private _selected: boolean;
    private _disabled: boolean;
    public get disabled() { return this._disabled; }

    private readonly _view: View;
    private _div: HTMLDivElement | undefined;

    constructor(props: InstanceProps, view: View) {
        this._workspaceId = props.workspaceId;
        this._instanceId = props.id;
        this._x = props.x;
        this._y = props.y;
        this._zIndex = props.zIndex;
        this._view = view;
    }

    public getDiv(): HTMLDivElement {
        this._div = document.createElement("div");

        this._div.id = `instance-${this._instanceId}`;
        this._div.classList.add("instance-wrapper");
        this._div.style.zIndex = `${this._zIndex}`;
        this._div.style.transform = `translate(${this._x}px, ${this._y}px)`;

        return this._div;
    }

    public getView(): View {
        return this._view;
    }

    public getMoveProps(): InstanceMoveProps {
        return {
            workspaceId: this._workspaceId,
            id: this._instanceId,
            x: this._x,
            y: this._y,
            zIndex: this._zIndex,
        };
    }

    public isInBox(x1: number, y1: number, x2: number, y2: number): boolean {
        if ( !this._height || !this._width) {
            this._height = this._div!.offsetHeight;
            this._width = this._div!.offsetWidth;
        }
        return (
            this._x < x2 &&
            this._x + this._width > x1 &&
            this._y < y2 &&
            this._y + this._height > y1
        );
    }

    public removeDiv() {
        this._div?.remove();
    }

    public setSelected(selected: boolean) {
        this._selected = selected;
        this._div?.classList.toggle("selected", selected);
    }

    public setHoveredOver(hoveredOver: boolean) {
        this._div?.classList.toggle("hovered-over", hoveredOver);
    }

    public canViewCombine(): boolean {
        return this._view.canCombine();
    }
    public setViewCombining(combining: boolean) {
        this._view.setCombining(combining);
    }
    public setDisabled(disabled: boolean) {
        this._disabled = disabled;
        this._div?.classList.toggle("disabled", disabled);
    }

    public getPosDim(): {x: number, y: number, width: number, height: number} {
        if ( !this._height || !this._width) {
            this._height = this._div!.offsetHeight;
            this._width = this._div!.offsetWidth;
        }
        return {
            x: this._x,
            y: this._y,
            height: this._height,
            width: this._width,
        }
    }

    public updatePosition(offsetX: number, offsetY: number, zIndex: number) {
        this._x += offsetX;
        this._y += offsetY;
        this._zIndex = zIndex;
        this._div!.style.zIndex = `${this._zIndex}`;
        this._div!.style.transform = `translate(${this._x}px, ${this._y}px)`;
    }

    public moveDivTo(dest: HTMLDivElement) {
        dest.appendChild(this._div);
    }

    public getDuplicate(dragOffsetX: number, dragOffsetY: number, zIndex?: number): NewInstanceProps {
        return {
            x: this._x + dragOffsetX,
            y: this._y + dragOffsetY,
            zIndex: zIndex ? zIndex : this._zIndex,
            type: this._view.type(),
            data: this._view.data(),
        }
    }
}
