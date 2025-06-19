import "./sidebar.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import {WORKSPACE_SPAWN_INSTANCE} from "../../signals/CustomEvents";
import type {WorkspaceSpawnEvent} from "../../signals/CustomEvents";
import {ViewTypeProps} from "../../types/dbSchema";
import {Item} from "./items/Item";

// todo - add input captures:
//      (onViewCopyEmojiText, onViewInfo, elementToggleVisibility)
export class Sidebar implements IComponent {
    private sidebar: HTMLDivElement;
    private resizer: HTMLDivElement;
    private sidebarItems: HTMLDivElement;

    private static readonly MIN_WIDTH: number = 16;
    private static readonly MAX_WIDTH: number = 2000;
    private width: number = 400;

    private isResizing = false;

    constructor() {
        this.sidebar = <HTMLDivElement>document.getElementById("sidebar");
        this.resizer = <HTMLDivElement>document.getElementById("resizer");
        this.sidebarItems = <HTMLDivElement>document.getElementById("sidebar-items");

        document.documentElement.style.setProperty('--sidebar-width', `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onStartResizing);
        this.sidebar.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("sidebar", e)(e);
        });

        app.inputCapture.set("sidebar", [ // to block workspace actions
            { kind: "mousedown", settingsKey: "instanceSelecting", handler: this.blockInputCapture },
            { kind: "mousedown", settingsKey: "instanceDeleting", handler: this.blockInputCapture },
        ]);
        app.inputCapture.set("item", [
            { kind: "mousedown", settingsKey: "instanceDragging", handler: this.onSpawnInstance },
            { kind: "mousedown", settingsKey: "instanceCopying", handler: this.onSpawnInstance },
        ]);
        // app.inputCapture.set("view", [
        //     { kind: "mousedown", settingsKey: "viewInfo", handler: this.onViewInfo },
        //     { kind: "mousedown", settingsKey: "viewCopyEmojiText", handler: this.onViewCopyEmojiText },
        // ]);

        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._saveLoaded.subscribe(this.onSaveLoaded);
    }

    private onSaveUnloaded = () => {
        this.sidebarItems.innerHTML = "";
    }

    private onSaveLoaded = () => {
        app.state.elementsById.forEach((props) => {
            const item = new Item(props);
            const itemDiv = item.getDiv();
            itemDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("item", e)(e, props.id);
            });

            this.sidebarItems.appendChild(itemDiv);
        });
    }

    private onStartResizing = (e: MouseEvent) => {
        e.stopPropagation();
        this.isResizing = true;

        document.addEventListener("mousemove", this.onUpdateResizing);
        document.addEventListener("mouseup", this.onEndResizing);
    }

    private onUpdateResizing = (e: MouseEvent) => {
        if ( !this.isResizing) return;

        const newWidth = window.innerWidth - e.clientX;
        this.width = Math.min(Sidebar.MAX_WIDTH, Math.max(Sidebar.MIN_WIDTH, newWidth));
        document.documentElement.style.setProperty('--sidebar-width', `${this.width}px`);
    };

    private onEndResizing = () => {
        this.isResizing = false;

        document.removeEventListener("mousemove", this.onUpdateResizing);
        document.removeEventListener("mouseup", this.onEndResizing);
    }

    private blockInputCapture = (e: MouseEvent) => {
        e.stopPropagation();
    }

    private onSpawnInstance = (e: MouseEvent, id: number) => {
        e.stopPropagation();
        const event: WorkspaceSpawnEvent = new CustomEvent(WORKSPACE_SPAWN_INSTANCE, {
            detail: {
                originalEvent: e,
                type: ViewTypeProps.Element,
                data: id,
            },
            bubbles: true,
        });
        this.sidebar.dispatchEvent(event);
    }
}
