import "./board.css";
import {app} from "../../main";
import type {IComponent} from "../IComponent";
import {InstanceWrapper} from "./instances/InstanceWrapper";
import {ViewTypeProps} from "../../types/db/schema";
import type {InstanceProps} from "../../types/db/schema";
import type {NewInstanceProps, WorkspaceChangesProps} from "../../types/db/dto";
import {MAX_ZOOM, MIN_ZOOM, Z_INDEX_START, ZOOM_SENSITIVITY} from "../../constants/interaction";
import {View} from "./instances/View";
import type {WorkspaceSpawnEvent} from "../../signals/CustomEvents";
import {WORKSPACE_SPAWN_INSTANCE} from "../../signals/CustomEvents";
import {ElementView} from "./instances/ElementView";


// todo - delete instance when not selected and dropped over sidebar
export class Board implements IComponent {
    private readonly board: HTMLDivElement;
    private readonly dragLayer: HTMLDivElement;
    private instances: Map<number, InstanceWrapper> = new Map();
    private instancesByZIndex: InstanceWrapper[] = [];

    private offsetX: number; // px in scale 1
    private offsetY: number; // px in scale 1
    private scale: number;
    private maxZIndex: number;
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
    // combining - when dragging
    private canCombine: boolean = false;
    private combinesWith: number | undefined = undefined;

    // deletion
    private deleting: boolean = false;

    constructor() {
        this.board = document.getElementById("board") as HTMLDivElement;
        this.dragLayer = document.getElementById("drag-layer") as HTMLDivElement;
        this.selectionBox = document.getElementById("selection-box") as HTMLDivElement;

        const boardWrapper = document.getElementById("board-wrapper");
        boardWrapper.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("board", e)(e);
        });
        boardWrapper.addEventListener("wheel", (e: WheelEvent) => {
            app.inputCapture.matchWheel("board", e)(e);
        });
        boardWrapper.addEventListener(WORKSPACE_SPAWN_INSTANCE, this.onSpawnInstance);

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
        app.state._instancesCreated.subscribe(this.onInstancesCreated);
        app.state._workspaceUnloaded.subscribe(this.onWorkspaceUnloaded);
        app.state._stateWaiting.subscribe(this.onStateWaiting);
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

    private addInstancesToBoard = (instances: Iterable<InstanceProps>) => {
        for (const props of instances) {
            const view = View.getView(props.type || ViewTypeProps.Element, props.data);
            const viewDiv = view.getDiv();
            if ( !viewDiv) {
                app.logger.log("warning", "board", `Failed to load instance ${props}: ViewDiv not generated`);
                return;
            }
            viewDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("view", e)(e);
            });

            const instance = new InstanceWrapper(props, view);
            const instanceDiv = instance.getDiv();
            instanceDiv.appendChild(viewDiv);
            instanceDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("instance", e)(e, props.id);
            });

            this.instancesByZIndex[props.zIndex] = instance;
            this.maxZIndex = Math.max(this.maxZIndex, props.zIndex);

            this.instances.set(props.id, instance);
            this.board.appendChild(instanceDiv);
        }
    }

    private onWorkspaceLoaded = () => {
        this.setOffsetAndScale(app.state.activeWorkspace);
        this.maxZIndex = Z_INDEX_START;
        this.addInstancesToBoard(app.state.instances.values());
    }

    private onWorkspaceTransformed = (changes: Partial<WorkspaceChangesProps>) => {
        this.setOffsetAndScale(changes);
    }

    private onInstancesCreated = (instances: InstanceProps[]) => {
        this.addInstancesToBoard(instances);
    }

    private onWorkspaceUnloaded = () => {
        this.instances.forEach(i => i.removeDiv());
        this.instances = new Map();
        this.instancesByZIndex = [];
    }

    private clearDragging = () => {
        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragged = new Set();
        this.canCombine = false
        this.combinesWith = undefined;
    }

    private clearSelection = () => {
        this.selecting = false;
        this.selected = new Set();
        this.selectionBox.style.display = "none";
    }

    private onStateWaiting = () => {
        this.panning = false;
        this.deleting = false;
        this.clearSelection();
        this.clearDragging();
        this.updateTransform();
    }

    private onSpawnInstance = (e: WorkspaceSpawnEvent) => {
        const view = View.getView(e.detail.type || ViewTypeProps.Element, e.detail.data);
        const [ unscaledWidth, unscaledHeight ] = View.measureUnscaledSize(view);
        const [ boardX, boardY ] = this.getBoardCoordinates(e.detail.originalEvent);
        const x = boardX - unscaledWidth / 2;
        const y = boardY - unscaledHeight / 2;

        const created = app.state.createInstance({
            x: x,
            y: y,
            zIndex: ++this.maxZIndex,
            type: e.detail.type || ViewTypeProps.Element,
            data: e.detail.data,
        });
        this.onStartDragging(e.detail.originalEvent, created.id);
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

    private getBoardCoordinates(e: { clientX: number, clientY: number }): [number, number] {
        const rect = this.board.getBoundingClientRect();
        const unscaledX = e.clientX - rect.left;
        const unscaledY = e.clientY - rect.top;

        const scaledX = unscaledX / this.scale;
        const scaledY = unscaledY / this.scale;

        return [ scaledX, scaledY ];
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
            if ( !instance.disabled && instance.isInBox(left, top, left + width, top + height)) {
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
        if (newScale === this.scale) return;

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

    // accounts for deleting the whole selection
    private removeInstanceById = (removeId: number): Set<number> => {
        if (this.instances.get(removeId).disabled) return new Set();
        let toDelete: Set<number> = new Set([removeId]);
        if (this.selected.has(removeId)) {
            this.selected.forEach(id => {
                if (this.instances.has(id)) {
                    toDelete.add(id);
                }
            })
            this.clearSelection();
        }
        this.clearDragging();

        toDelete.forEach(id => {
            const i = this.instances.get(id);
            i.removeDiv();
            this.instances.delete(id);
            delete this.instancesByZIndex[i.zIndex];
        })

        return toDelete;
    }

    private removeAllInstancesByPosition = (x: number, y: number): Set<number> => {
        const toDelete: Set<number> = new Set();
        let deleteSelected = false;
        this.instances.forEach((instance, id) => {
            if ( !instance.disabled && instance.isInBox(x, y, x, y)) {
                toDelete.add(id);
                if (this.selected.has(id)) {
                    deleteSelected = true;
                }
            }
        });
        if (deleteSelected) {
            this.selected.forEach(id => {
                if (this.instances.has(id)) {
                    toDelete.add(id);
                }
            })
            this.clearSelection();
        }
        this.clearDragging();

        toDelete.forEach(id => {
            const i = this.instances.get(id);
            i.removeDiv();
            this.instances.delete(id);
            delete this.instancesByZIndex[i.zIndex];
        })

        return toDelete;
    }

    private onStartDeleting = (e: MouseEvent, id?: number) => {
        if (this.deleting) return;
        e.stopPropagation();

        this.deleting = true;

        let deleted: Set<number>;
        if (id === undefined) {
            deleted = this.removeAllInstancesByPosition(...this.getBoardCoordinates(e));
        } else {
            deleted = this.removeInstanceById(id);
        }
        if (deleted.size !== 0) {
            app.state.deleteInstances(deleted);
        }

        window.addEventListener("mousemove", this.onUpdateDeleting);
        window.addEventListener("mouseup", this.onEndDeleting);
    }

    private onUpdateDeleting = (e: MouseEvent) => {
        if ( !this.deleting) return;

        const deleted = this.removeAllInstancesByPosition(...this.getBoardCoordinates(e));
        if (deleted.size !== 0) {
            app.state.deleteInstances(deleted);
        }
    }

    private onEndDeleting = (e: MouseEvent) => {
        if ( !app.inputCapture.matchMouseUp(e, this.onStartDeleting)) return;
        this.deleting = false;

        window.removeEventListener("mousemove", this.onUpdateDeleting);
        window.removeEventListener("mouseup", this.onEndDeleting);
    }

    private onStartDragging = (e: MouseEvent, id: number) => {
        if (this.dragging || this.selecting) return;
        e.stopPropagation();

        this.dragging = true;

        const isSelected = this.selected.has(id);
        this.canCombine = !isSelected && this.instances.get(id).canViewCombine();
        this.combinesWith = undefined;

        this.dragged = isSelected ? this.selected : new Set([id]);
        this.dragged.forEach((id) => {
            const i = this.instances.get(id);
            i.moveDivTo(this.dragLayer);
            delete this.instancesByZIndex[i.zIndex];
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

        if (this.canCombine) {
            const [draggedId] = this.dragged;
            let {x, y, width, height} = this.instances.get(draggedId).getPosDim();
            x += this.dragOffsetX;
            y += this.dragOffsetY;

            const found = Object.keys(this.instancesByZIndex)
                .reverse()
                .map(Number)
                .some(zIndex => {
                    const i = this.instancesByZIndex[zIndex];
                    const id = i.id;
                    if (
                        id === draggedId ||
                        !i.canViewCombine() ||
                        !i.isInBox(x, y, x + width, y + height)
                    ) {
                        return;
                    }

                    if (this.combinesWith === id) return true;
                    if (this.combinesWith !== undefined) {
                        this.instances.get(this.combinesWith)?.setHoveredOver(false);
                    }
                    this.combinesWith = id;
                    i.setHoveredOver(true);
                    return true;
                });

            if ( !found && this.combinesWith !== undefined) {
                const i = this.instances.get(this.combinesWith);
                i?.setHoveredOver(false);
                this.combinesWith = undefined;
            }
        }
        this.updateTransform();
    }

    private onEndDragging = (e: MouseEvent) => {
        if ( !app.inputCapture.matchMouseUp(e, this.onStartDragging)) return;
        this.dragging = false;

        const toMove: InstanceWrapper[] = Array.from(this.dragged)
            .map(id => this.instances.get(id))
            .filter(instance => instance !== undefined)
            .sort((a, b) => (a.zIndex - b.zIndex));

        toMove.forEach(i => {
            i.moveDivTo(this.board);
            i.updatePosition(this.dragOffsetX, this.dragOffsetY, ++this.maxZIndex);
            this.instancesByZIndex[this.maxZIndex] = i;
        });
        app.state.moveInstances(toMove);

        if (this.canCombine && this.combinesWith !== undefined) {
            const [draggedId] = this.dragged;
            const i1 = this.instances.get(draggedId);
            const i2 = this.instances.get(this.combinesWith);
            this.instances.get(this.combinesWith)!.setHoveredOver(false);

            if (this.selected.has(i2.id)) {
                i2.setSelected(false);
                this.selected.delete(this.combinesWith);
            }
            i1.setDisabled(true);
            i2.setDisabled(true);
            i1.setViewCombining(true);
            i2.setViewCombining(true);

            app.state.combineElements(i1.getView() as ElementView, i2.getView() as ElementView);
        }

        this.dragged = new Set();
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.updateTransform();

        window.removeEventListener("mousemove", this.onUpdateDragging);
        window.removeEventListener("mouseup", this.onEndDragging);
    }

    private onStartCopying = (e: MouseEvent, id: number) => {
        if (this.selecting) return;
        e.stopPropagation();

        if (this.dragging) {
            // copy instances on top of the board

            const toCopy: InstanceWrapper[] = Array.from(this.dragged)
                .map(id => this.instances.get(id))
                .filter(instance => instance !== undefined)
                .sort((a, b) => (a.zIndex - b.zIndex));

            const newInstances: NewInstanceProps[] = [];
            toCopy.forEach(i => {
                newInstances.push(i.getDuplicate(this.dragOffsetX, this.dragOffsetY, ++this.maxZIndex));
            });

            app.state.createInstances(newInstances);

        } else {
            // need to start dragging the instances that just got created, leave the clicked ones as they were
            // originally started dragging these instances, created new instances with the same zIndex,
            //      but that didn't ensure unique zIndex when the page was closed before dropping the dragged instances

            const toCopy: InstanceWrapper[] = Array.from(this.selected.has(id) ? this.selected : [id])
                .map(id => this.instances.get(id))
                .filter(instance => instance !== undefined)
                .sort((a, b) => (a.zIndex - b.zIndex));

            const newInstances: NewInstanceProps[] = [];
            toCopy.forEach(i => {
                newInstances.push(i.getDuplicate(this.dragOffsetX, this.dragOffsetY, ++this.maxZIndex));
            });

            const created = app.state.createInstances(newInstances);

            // if the original ones were selected, change selection to the created ones
            if (this.selected.has(id)) {
                this.selected.forEach((i) => {
                    this.instances.get(i)?.setSelected(false);
                })
                this.selected = new Set();
                created.forEach(i => {
                    this.selected.add(i.id);
                    this.instances.get(i.id)?.setSelected(true);
                })
            }

            this.onStartDragging(e, created[0].id);
        }
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
}
