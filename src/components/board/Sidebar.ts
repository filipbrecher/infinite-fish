import "./sidebar.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import {WORKSPACE_SPAWN_INSTANCE} from "../../signals/CustomEvents";
import type {WorkspaceSpawnEvent} from "../../signals/CustomEvents";
import {ViewTypeProps} from "../../types/db/schema";
import {ItemWrapper} from "./wrappers/ItemWrapper";
import {DEFAULT_SIDEBAR_WIDTH} from "../../constants/defaults";
import {MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH} from "../../constants/interaction";
import {ElementView} from "./views/ElementView";
import {State} from "../../types/services";


// todo - subscribe to state for _elementAdded and _elementUpdated
// todo - add input captures:
//      (onViewCopyEmojiText, onViewInfo, elementToggleVisibility)
export class Sidebar implements IComponent {
    private readonly sidebar: HTMLDivElement;
    private readonly resizer: HTMLDivElement;
    private readonly sidebarItems: HTMLDivElement;

    private disabled: boolean = false;

    private readonly searchInput: HTMLInputElement;
    private lastCaret = 0;

    private showHidden: boolean = false;
    private showOnlyDiscoveries: boolean = false;
    private readonly hiddenToggleDiv: HTMLDivElement;
    private readonly discoveryToggleDiv: HTMLDivElement;

    private width: number = DEFAULT_SIDEBAR_WIDTH;
    private isResizing = false;

    constructor() {
        this.sidebar = document.getElementById("sidebar") as HTMLDivElement;
        this.resizer = document.getElementById("resizer") as HTMLDivElement;
        this.sidebarItems = document.getElementById("sidebar-items") as HTMLDivElement;
        this.searchInput = document.getElementById("sidebar-search-input") as HTMLInputElement;
        this.hiddenToggleDiv = document.getElementById("sidebar-search-toggle-hidden") as HTMLDivElement;
        this.discoveryToggleDiv = document.getElementById("sidebar-search-toggle-discovery") as HTMLDivElement;

        document.documentElement.style.setProperty('--sidebar-width', `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onStartResizing);
        this.sidebar.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("sidebar", e)(e);
        });

        window.addEventListener('keydown', this.onKeyDown);
        this.searchInput.addEventListener('blur', () => {
            this.lastCaret = this.searchInput.selectionStart ?? 0;
        });

        this.hiddenToggleDiv.addEventListener("click", this.toggleHidden);
        this.discoveryToggleDiv.addEventListener("click", this.toggleDiscoveries);

        app.inputCapture.set("sidebar", [ // to block workspace actions
            { kind: "mousedown", settingsKey: "instanceSelecting", handler: this.blockInputCapture },
            { kind: "mousedown", settingsKey: "instanceDeleting", handler: this.blockInputCapture },
        ]);
        app.inputCapture.set("sidebar-item", [
            { kind: "mousedown", settingsKey: "instanceDragging", handler: this.onSpawnInstance },
            { kind: "mousedown", settingsKey: "instanceCopying", handler: this.onSpawnInstance },
            { kind: "mousedown", settingsKey: "elementToggleVisibility", handler: this.onToggleElementVisibility },
        ]);
        app.inputCapture.set("sidebar-view", [
            { kind: "mousedown", settingsKey: "viewInfo", handler: this.onViewInfo },
            { kind: "mousedown", settingsKey: "viewCopyEmojiText", handler: this.onViewCopyEmojiText },
        ]);

        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._saveLoaded.subscribe(this.onSaveLoaded);
    }

    private onSaveUnloaded = () => {
        this.sidebarItems.innerHTML = "";
    }

    private onSaveLoaded = () => {
        app.state.elementsById.forEach((props) => {
            const view = new ElementView(props);
            const viewDiv = view.getDiv();
            viewDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("sidebar-view", e)(e);
            });

            const item = new ItemWrapper(view);
            const itemDiv = item.getDiv();
            itemDiv.appendChild(viewDiv);
            itemDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("sidebar-item", e)(e, props.id);
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

    private toggleHidden = () => {
        this.showHidden = !this.showHidden;
        this.hiddenToggleDiv.classList.toggle("toggle-on", this.showHidden);
    }

    private toggleDiscoveries = () => {
        this.showOnlyDiscoveries = !this.showOnlyDiscoveries;
        this.discoveryToggleDiv.classList.toggle("toggle-on", this.showOnlyDiscoveries);
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

    private onToggleElementVisibility = (e: MouseEvent) => {
        console.log("sidebar.view.onToggleElementVisibility");
        e.stopPropagation();

        // todo
    }

    private onViewInfo = (e: MouseEvent) => {
        console.log("sidebar.view.onViewInfo");
        e.stopPropagation();

        // todo
    }

    private onViewCopyEmojiText = (e: MouseEvent) => {
        console.log("sidebar.view.onViewCopyEmojiText");
        e.stopPropagation();

        // todo
    }

    private onKeyDown = () => {
        if (this.disabled || app.state.state !== State.RUNNING) return;
        if (document.activeElement === this.searchInput) return;

        // don't steal focus if user is typing elsewhere
        const active = document.activeElement;
        const isTyping = active && (
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.getAttribute("contenteditable") === "true"
        );
        if (isTyping) return;

        this.searchInput.focus();
        this.searchInput.setSelectionRange(this.lastCaret, this.lastCaret);
    }
}
