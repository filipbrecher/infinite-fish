import "./sidebar.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import {WORKSPACE_SPAWN_INSTANCE} from "../../signals/CustomEvents";
import type {WorkspaceSpawnEvent} from "../../signals/CustomEvents";
import {ViewTypeProps} from "../../types/db/schema";
import {Item} from "./items/Item";
import {DEFAULT_SIDEBAR_WIDTH} from "../../constants/defaults";
import {MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH} from "../../constants/interaction";


// todo - add input captures:
//      (onViewCopyEmojiText, onViewInfo, elementToggleVisibility)
export class Sidebar implements IComponent {
    private sidebar: HTMLDivElement;
    private resizer: HTMLDivElement;
    private sidebarItems: HTMLDivElement;
    private disabled: boolean = false;

    private width: number = DEFAULT_SIDEBAR_WIDTH;

    private isResizing = false;

    constructor() {
        this.sidebar = document.getElementById("sidebar") as HTMLDivElement;
        this.resizer = document.getElementById("resizer") as HTMLDivElement;
        this.sidebarItems = document.getElementById("sidebar-items") as HTMLDivElement;

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

        window.addEventListener("mousemove", this.onUpdateResizing);
        window.addEventListener("mouseup", this.onEndResizing);
    }

    private onUpdateResizing = (e: MouseEvent) => {
        if ( !this.isResizing) return;

        const newWidth = window.innerWidth - e.clientX;
        this.width = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth));
        document.documentElement.style.setProperty('--sidebar-width', `${this.width}px`);
    };

    private onEndResizing = () => {
        this.isResizing = false;

        window.removeEventListener("mousemove", this.onUpdateResizing);
        window.removeEventListener("mouseup", this.onEndResizing);
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

    public isXOverSidebar = (x: number): boolean => {
        return x >= window.innerWidth - this.width;
    }

    public setDisabled = (disabled: boolean) => {
        if (this.disabled === disabled) return;
        this.disabled = disabled;
        this.sidebar.style.pointerEvents = disabled ? "none" : "auto";
    }
}
