import "./board.css"
import {app} from "../../main";
import type {IComponent} from "../IComponent";
import {Instance} from "./objects/Instance";
import type {WorkspaceChangesProps} from "../../types/dbSchema";
import {InstanceTypeProps} from "../../types/dbSchema";
import {MAX_ZOOM, MIN_ZOOM, ZOOM_SENSITIVITY} from "../../constants/defaults";
import {View} from "./objects/View";


// todo - change instance to instance wrapper class and make it hold the view div?? (possibly?)
export class Board implements IComponent {
    private readonly board: HTMLDivElement;
    private readonly dragLayer: HTMLDivElement;
    private instances: Map<number, Instance> = new Map();

    private offsetX: number; // px in scale 1
    private offsetY: number; // px in scale 1
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
    private dragging: boolean = false;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;

    constructor() {
        this.board = <HTMLDivElement>document.getElementById("board");
        this.dragLayer = <HTMLDivElement>document.getElementById("drag-layer");
        this.selectionBox = <HTMLDivElement>document.getElementById("selection-box");

        const boardWrapper = document.getElementById("board-wrapper");
        boardWrapper.addEventListener("contextmenu", Board.preventDefaultEvent);
        boardWrapper.addEventListener("wheel", Board.preventDefaultEvent);
        boardWrapper.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("board", e)(e);
        });
        boardWrapper.addEventListener("wheel", (e: WheelEvent) => {
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

    private updateTransform = () => {
        this.board.style.transform = `scale(${this.scale}) translate(${this.offsetX}px, ${this.offsetY}px)`;
        this.dragLayer.style.transform = `scale(${this.scale}) translate(${this.offsetX + this.dragOffsetX}px, ${this.offsetY + this.dragOffsetY}px)`;
    };

    private setOffsetAndScale = (changes: Partial<WorkspaceChangesProps>) => {
        if (changes.x !== undefined) this.offsetX = changes.x;
        if (changes.y !== undefined) this.offsetY = changes.y;
        if (changes.scale !== undefined) this.scale = changes.scale;

        this.updateTransform();
    };

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
                app.inputCapture.matchMouseDown("instance", e)(e, props.id);
            });
            viewDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("view", e)(e);
            });

            this.instances.set(props.id, instance);
            this.board.appendChild(instanceDiv);
        });
    }

    private onWorkspaceTransformed = (changes: Partial<WorkspaceChangesProps>) => {
        this.setOffsetAndScale(changes);
    }

    private onWorkspaceUnloaded = () => {
        this.instances.forEach(i => i.removeDiv());
        this.instances = new Map();
    }

    private onStartPanning = (e: MouseEvent) => {
        if (this.panning) return;
        e.stopPropagation();

        this.panning = true;
        window.addEventListener("mousemove", this.onUpdatePanning);
        window.addEventListener("mouseup", this.onEndPanning);
    }

    private onUpdatePanning = (e: MouseEvent) => {
        if ( !this.panning) return;

        this.setOffsetAndScale({ x: this.offsetX + e.movementX / this.scale, y: this.offsetY + e.movementY / this.scale });
    }

    private onEndPanning = (e: MouseEvent) => {
        if ( !app.inputCapture.matchMouseUp(e, this.onStartPanning)) return;
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
        if (this.selecting || this.dragging) return;
        e.stopPropagation();

        this.selecting = true;
        for (const id of this.selected) {
            this.instances.get(id).setSelected(false);
        }
        this.selected = new Set();

        [ this.selectionStartX, this.selectionStartY ] = this.getBoardCoordinates(e);
        window.addEventListener("mousemove", this.onUpdateSelecting);
        window.addEventListener("mouseup", this.onEndSelecting);
    }

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

        this.selected = new Set();
        this.instances.forEach((instance, id) => {
            if (instance.isInBox(left, top, left + width, top + height)) {
                instance.setSelected(true);
                this.selected.add(id);
            } else {
                instance.setSelected(false);
            }
        });
    }

    private onEndSelecting = (e: MouseEvent) => {
        if ( !app.inputCapture.matchMouseUp(e, this.onStartSelecting)) return;
        this.selecting = false;

        this.selectionBox.style.display = "none";
        window.removeEventListener("mousemove", this.onUpdateSelecting);
        window.removeEventListener("mouseup", this.onEndSelecting);
    }

    private onWheel = (e: WheelEvent) => {
        e.stopPropagation();

        const scaleFactor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
        const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.scale * scaleFactor));

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const offsetChangeRatio = 1 / this.scale - 1 / newScale;

        const newX = this.offsetX - offsetChangeRatio * mouseX;
        const newY = this.offsetY - offsetChangeRatio * mouseY;

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

    private onStartDragging = (e: MouseEvent, id: number) => {
        if (this.dragging || this.selecting) return;
        e.stopPropagation();

        this.dragging = true;

        this.dragged = this.selected.has(id) ? this.selected : new Set([id]);
        this.dragged.forEach((id) => {
            this.instances.get(id).moveDivTo(this.dragLayer);
        });

        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        window.addEventListener("mousemove", this.onUpdateDragging);
        window.addEventListener("mouseup", this.onEndDragging);
    }

    private onUpdateDragging = (e: MouseEvent) => {
        if ( !this.dragging || this.panning) return;

        this.dragOffsetX += e.movementX / this.scale;
        this.dragOffsetY += e.movementY / this.scale;
        this.updateTransform();
    }

    private onEndDragging = (e: MouseEvent) => {
        if ( !app.inputCapture.matchMouseUp(e, this.onStartDragging)) return;
        this.dragging = false;

        this.dragged.forEach((id) => {
            const i = this.instances.get(id);
            i.moveDivTo(this.board);
            i.updateCoordinates(this.dragOffsetX, this.dragOffsetY);
        });
        app.state.moveInstances(this.dragged, this.dragOffsetX, this.dragOffsetY);

        this.dragged = new Set();
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.updateTransform();

        window.removeEventListener("mousemove", this.onUpdateDragging);
        window.removeEventListener("mouseup", this.onEndDragging);
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
