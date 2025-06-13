import "./board.css"
import {app} from "../../main";
import type {IComponent} from "../IComponent";
import {Instance} from "./objects/Instance";
import type {WorkspaceChangesProps} from "../../types/dbSchema";
import {MAX_ZOOM, MIN_ZOOM, ZOOM_AMOUNT} from "../../constants/defaults";


export class Board implements IComponent {
    private readonly board: HTMLDivElement;
    private readonly dragLayer: HTMLDivElement;
    private instances: Map<number, Instance> = new Map();

    private offsetX: number;
    private offsetY: number;
    private scale: number;
    private panning: boolean = false;

    // selection
    private selected: Set<number> = new Set();

    // instance dragging
    private dragged: Set<number> = new Set();
    private isDragging: boolean = false;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;

    constructor() {
        this.board = <HTMLDivElement>document.getElementById("board");
        this.dragLayer = <HTMLDivElement>document.getElementById("drag-layer");

        const appDiv = document.getElementById("app");
        appDiv.addEventListener("contextmenu", Board.preventDefaultEvent);
        appDiv.addEventListener("wheel", Board.preventDefaultEvent);
        appDiv.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("board", e)(e);
        });
        appDiv.addEventListener("wheel", (e: WheelEvent) => {
            app.inputCapture.matchWheel("board", e)(e);
        });

        app.inputCapture.set("board", [
            { kind: "mousedown", settingsKey: "workspacePanning", handler: this.onStartPanning },
            { kind: "mousedown", settingsKey: "instanceSelecting", handler: this.onStartSelecting },
            { kind: "wheel", settingsKey: "workspaceZooming", handler: this.onWheel },
        ]);

        app.state._workspaceLoaded.subscribe(this.onWorkspaceLoaded);
        app.state._workspaceTransformed.subscribe(this.onWorkspaceTransformed);
        app.state._workspaceUnloaded.subscribe(this.onWorkspaceUnloaded);
    }

    private setOffsetAndScale = (changes: Partial<WorkspaceChangesProps>) => {
        if (changes.x) this.offsetX = changes.x;
        if (changes.y) this.offsetY = changes.y;
        if (changes.scale) this.scale = changes.scale;

        this.board.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.dragLayer.style.transform = `translate(${this.offsetX + this.dragOffsetX}px, ${this.offsetY + this.dragOffsetY}px) scale(${this.scale})`;
    }

    private onWorkspaceLoaded = () => {
        this.setOffsetAndScale(app.state.activeWorkspace);

        app.state.instances.forEach((props) => {
            const instance = new Instance(props);
            const div = instance.getDiv();
            if ( !div) return;

            this.instances.set(props.id, instance);
            this.board.appendChild(div);
        });
        this.instances.forEach((i) => {
            i.calculateSize();
        })
    }

    private onWorkspaceTransformed = () => {
        this.setOffsetAndScale(app.state.activeWorkspace);
    }

    private onWorkspaceUnloaded = () => {
        this.instances.forEach(i => i.removeDiv());
        this.instances = new Map();
    }

    private onStartPanning = (e: MouseEvent) => {
        e.stopPropagation();

        this.panning = true;
        window.addEventListener("mousemove", this.onUpdatePanning);
        window.addEventListener("mouseup", this.onEndPanning);
    }

    private onUpdatePanning = (e: MouseEvent) => {
        if ( !this.panning) return;

        this.setOffsetAndScale({ x: this.offsetX + e.movementX, y: this.offsetY + e.movementY });
    }

    private onEndPanning = () => {
        this.panning = false;

        app.state.updateWorkspace({ x: this.offsetX, y: this.offsetY });
        window.removeEventListener("mousemove", this.onUpdatePanning);
        window.removeEventListener("mouseup", this.onEndPanning);
    }

    private onStartSelecting = (e: MouseEvent) => {
        console.log("board.onStartSelecting");
        e.stopPropagation();

        // todo
    }

    private onWheel = (e: WheelEvent) => {
        e.stopPropagation();

        const newValues: Partial<WorkspaceChangesProps> = {};
        const scaleFactor = 1 - e.deltaY * ZOOM_AMOUNT / 100;
        newValues.scale = Math.min(Math.max(MIN_ZOOM, this.scale * scaleFactor), MAX_ZOOM);

        const rect = this.board.getBoundingClientRect();
        if ( !rect) return;

        const mouseX = e.clientX + this.offsetX - rect.left;
        const mouseY = e.clientY + this.offsetY - rect.top;

        const dx = mouseX - this.offsetX;
        const dy = mouseY - this.offsetY;

        newValues.x = mouseX - dx * (newValues.scale / this.scale);
        newValues.y = mouseY - dy * (newValues.scale / this.scale);

        app.state.updateWorkspace(newValues);
    }

    private static preventDefaultEvent = (e: Event) => {
        e.preventDefault();
    };
}
