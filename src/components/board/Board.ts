import "./board.css"
import {app} from "../../main";
import type {IComponent} from "../IComponent";
import {Instance} from "./objects/Instance";
import type {WorkspaceChangesProps} from "../../types/dbSchema";
import {InstanceTypeProps} from "../../types/dbSchema";
import {MAX_ZOOM, MIN_ZOOM, ZOOM_AMOUNT} from "../../constants/defaults";
import {View} from "./objects/View";


export class Board implements IComponent {
    private readonly board: HTMLDivElement;
    private readonly dragLayer: HTMLDivElement;
    private instances: Map<number, Instance> = new Map();

    private offsetX: number;
    private offsetY: number;
    private scale: number;
    private panning: boolean = false;

    // selection
    private readonly selectionBox: HTMLDivElement;
    private selectionStartX: number;
    private selectionStartY: number;
    private selecting: boolean = false;
    private selected: Set<number> = new Set();

    // instance dragging
    private dragged: Set<number> = new Set();
    private isDragging: boolean = false;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;

    constructor() {
        this.board = <HTMLDivElement>document.getElementById("board");
        this.dragLayer = <HTMLDivElement>document.getElementById("drag-layer");
        this.selectionBox = <HTMLDivElement>document.getElementById("selection-box");

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
            { kind: "mousedown", settingsKey: "instanceDeleting", handler: this.onStartDeleting },
            { kind: "wheel", settingsKey: "workspaceZooming", handler: this.onWheel },
        ]);
        app.inputCapture.set("instance", [
            { kind: "mousedown", settingsKey: "instanceDragging", handler: this.onStartDragging },
            { kind: "mousedown", settingsKey: "instanceCopying", handler: this.onStartCopying },
            { kind: "mousedown", settingsKey: "instanceDeleting", handler: this.onStartDeleting },
        ]);
        app.inputCapture.set("view", [
            { kind: "mousedown", settingsKey: "viewInfo", handler: this.onViewInfo },
            { kind: "mousedown", settingsKey: "viewCopyEmojiText", handler: this.onViewCopyEmojiText },
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
            const view = View.getView(props.type || InstanceTypeProps.Element, props.data);
            const instance = new Instance(props);

            const viewDiv = view.getDiv();
            const instanceDiv = instance.getDiv();
            if ( !viewDiv || !instanceDiv) {
                app.logger.log("warning", "board", `Failed to load instance ${props}: ViewDiv or InstanceDiv not generated`);
                return;
            }
            instanceDiv.appendChild(viewDiv);

            instanceDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("instance", e)(e);
            });
            viewDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("view", e)(e);
            });

            this.instances.set(props.id, instance);
            this.board.appendChild(instanceDiv);
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

        console.log("onStartPanning");
        this.setOffsetAndScale({ x: this.offsetX + e.movementX, y: this.offsetY + e.movementY });
    }

    private onEndPanning = () => {
        this.panning = false;

        app.state.updateWorkspace({ x: this.offsetX, y: this.offsetY });
        window.removeEventListener("mousemove", this.onUpdatePanning);
        window.removeEventListener("mouseup", this.onEndPanning);
    }

    private getBoardCoordinates(e: MouseEvent): [number, number] {
        const rect = this.board.getBoundingClientRect();
        const scaledX = e.clientX - rect.left;
        const scaledY = e.clientY - rect.top;

        const unscaledX = scaledX / this.scale;
        const unscaledY = scaledY / this.scale;

        return [ unscaledX, unscaledY ];
    }

    private onStartSelecting = (e: MouseEvent) => {
        e.stopPropagation();

        this.selecting = true;
        [ this.selectionStartX, this.selectionStartY ] = this.getBoardCoordinates(e);
        window.addEventListener("mousemove", this.onUpdateSelecting);
        window.addEventListener("mouseup", this.onEndSelecting);
    }

    // todo - fix when moving board (with middle scroll button) and having a selection box, then upon releasing middle scroll button
    //        the selection box doesn't disappear (onEndSelecting either recognizes or in some other way)
    //      - basically just add a method to InputCaptureService that for a handler function checks that
    //        the settings requirements (for buttons pressed -> not for keys) hold (at least one of the buttons is still pressed)
    //        maybe something like actionEnded(this.onStartDeleting) -> goes through all layers and ActionEntries and at least
    //        one ActionEntry must still match a button for the action not ending yet
    private onUpdateSelecting = (e: MouseEvent) => {
        if ( !this.selecting) return;
        this.selectionBox.style.display = "block";

        const [ boardX, boardY ] = this.getBoardCoordinates(e);
        const left = Math.min(boardX, this.selectionStartX);
        const top = Math.min(boardY, this.selectionStartY);
        const width = Math.abs(boardX - this.selectionStartX);
        const height = Math.abs(boardY - this.selectionStartY);

        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;

        // todo - find all instances in the selection box
    }

    private onEndSelecting = () => {
        this.selecting = false;
        this.selectionBox.style.display = "none";
        window.removeEventListener("mousemove", this.onUpdateSelecting);
        window.removeEventListener("mouseup", this.onEndSelecting);
    }

    private onWheel = (e: WheelEvent) => {
        e.stopPropagation();

        const scaleFactor = 1 - e.deltaY * ZOOM_AMOUNT / 100;
        const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.scale * scaleFactor));

        const rect = this.board.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomRatio = newScale / this.scale;

        const newX = this.offsetX - (mouseX * (zoomRatio - 1));
        const newY = this.offsetY - (mouseY * (zoomRatio - 1));

        app.state.updateWorkspace({
            scale: newScale,
            x: newX,
            y: newY,
        });
    }

    private onStartDeleting = (e: MouseEvent) => {
        console.log("board/instance.onStartDeleting");
        e.stopPropagation();

        // todo
    }

    private onStartDragging = (e: MouseEvent) => {
        console.log("instance.onStartDragging");
        e.stopPropagation();

        // todo
    }

    private onStartCopying = (e: MouseEvent) => {
        console.log("instance.onStartCopying");
        e.stopPropagation();

        // todo
    }

    private onViewInfo = (e: MouseEvent) => {
        console.log("view.onViewInfo");
        e.stopPropagation();

        // todo
    }

    private onViewCopyEmojiText = (e: MouseEvent) => {
        console.log("view.onViewCopyEmojiText");
        e.stopPropagation();

        // todo
    }

    private static preventDefaultEvent = (e: Event) => {
        e.preventDefault();
    };
}
