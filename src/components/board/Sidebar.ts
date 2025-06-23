import "./sidebar.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import {WORKSPACE_SPAWN_INSTANCE} from "../../signals/CustomEvents";
import type {WorkspaceSpawnEvent} from "../../signals/CustomEvents";
import type {ElementProps} from "../../types/db/schema";
import {ViewTypeProps} from "../../types/db/schema";
import {ItemWrapper} from "./wrappers/ItemWrapper";
import {DEFAULT_SIDEBAR_WIDTH} from "../../constants/defaults";
import {MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH} from "../../constants/interaction";
import {ElementView} from "./views/ElementView";
import {State} from "../../types/services";
import type {UpsertElementProps} from "../../types/db/dto";
import {Utils} from "../../services/Utils";


type ElementWithLower = [ElementProps, string];

// todo - subscribe to state for _elementAdded and _elementUpdated
// todo - add input captures:
//      (onViewCopyEmojiText, onViewInfo, elementToggleVisibility)
export class Sidebar implements IComponent {
    private readonly sidebar: HTMLDivElement;
    private disabled: boolean = false;

    private readonly resizer: HTMLDivElement;
    private width: number = DEFAULT_SIDEBAR_WIDTH;
    private isResizing = false;

    private readonly searchInput: HTMLInputElement;
    private lowercaseSearchText: string = "";
    private lastCaret = 0;

    private showReversed: boolean = false;
    private showHidden: boolean = false;
    private showOnlyDiscoveries: boolean = false;
    private readonly orderToggleDiv: HTMLDivElement;
    private readonly hiddenToggleDiv: HTMLDivElement;
    private readonly discoveryToggleDiv: HTMLDivElement;

    private readonly sidebarItemsContainer: HTMLDivElement;
    // all elements (sorted by mixed case, with lower case cached)
    private sortedElements: ElementWithLower[] = [];
    // current filtered list shown in sidebar (sorted by mixed case + reversed if filter set)
    private filterTimeout: ReturnType<typeof setTimeout> | null = null;
    private filteredElements: ElementWithLower[] = [];
    private sidebarItems: ItemWrapper[] = [];

    constructor() {
        this.sidebar = document.getElementById("sidebar") as HTMLDivElement;
        this.resizer = document.getElementById("resizer") as HTMLDivElement;
        this.sidebarItemsContainer = document.getElementById("sidebar-items") as HTMLDivElement;
        this.searchInput = document.getElementById("sidebar-search-input") as HTMLInputElement;
        this.orderToggleDiv = document.getElementById("sidebar-search-toggle-order") as HTMLDivElement;
        this.hiddenToggleDiv = document.getElementById("sidebar-search-toggle-hidden") as HTMLDivElement;
        this.discoveryToggleDiv = document.getElementById("sidebar-search-toggle-discovery") as HTMLDivElement;

        document.documentElement.style.setProperty("--sidebar-width", `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onStartResizing);
        this.sidebar.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("sidebar", e)(e);
        });

        window.addEventListener("keydown", this.onKeyDown);
        this.searchInput.addEventListener("blur", () => {
            this.lastCaret = this.searchInput.selectionStart ?? 0;
        });
        this.searchInput.addEventListener("input", this.onSearchInputChange);

        this.orderToggleDiv.addEventListener("click", this.toggleOrder);
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
        app.state._elementAdded.subscribe(this.onElementAdded);
        app.state._elementUpdated.subscribe(this.onElementUpdated);
    }

    private static lowerBound(arr: ElementWithLower[], target: string): number {
        let low = 0;
        let high = arr.length;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (Utils.binaryCompare(arr[mid][0].text, target) < 0) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    private matchesFilter(ewl: ElementWithLower): boolean {
        if ( !ewl[1].includes(this.lowercaseSearchText)) return false;
        if ( !this.showHidden && ewl[0].hide) return false;
        if (this.showOnlyDiscoveries && !ewl[0].discovery) return false;
        return true;
    }

    private calculateFiltered() {
        let left = app.settings.settings.searchResultLimit;
        this.filteredElements = [];

        const inc = this.showReversed ? -1 : 1;
        for (let i = this.showReversed ? this.sortedElements.length - 1 : 0; this.showReversed ? i >= 0 : i < this.sortedElements.length; i += inc) {
            const ewl = this.sortedElements[i];
            if (this.matchesFilter(ewl)) {
                this.filteredElements.push(ewl);
                if (--left === 0) break;
            }
        }
    }

    private renderFiltered() {
        this.sidebarItemsContainer.innerHTML = "";
        this.sidebarItems = [];
        this.filteredElements.forEach((ewl) => {
            const view = new ElementView(ewl[0]);
            const viewDiv = view.getDiv();
            viewDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("sidebar-view", e)(e);
            });

            const item = new ItemWrapper(view);
            const itemDiv = item.getDiv(viewDiv);
            itemDiv.addEventListener("mousedown", (e: MouseEvent) => {
                app.inputCapture.matchMouseDown("sidebar-item", e)(e, ewl[0].id);
            });

            this.sidebarItems.push(item);
            this.sidebarItemsContainer.appendChild(itemDiv);
        });
    }

    private onFilterChange() {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);

        this.filterTimeout = setTimeout(() => {
            // todo - optimise
            this.calculateFiltered();
            this.renderFiltered();
        }, app.settings.settings.searchResultDebounce);
    }

    private onSaveUnloaded = () => {
        this.lastCaret = 0;
        this.searchInput.value = "";
        this.lowercaseSearchText = "";
        this.sidebarItemsContainer.innerHTML = "";
        this.sortedElements = [];
        this.filteredElements = [];
        this.sidebarItems = [];
    }

    private onSaveLoaded = () => {
        this.sortedElements = app.state.elementsById.map(e => [e, e.text.toLowerCase()]);
        this.sortedElements.sort((a, b) => Utils.binaryCompare(a[1], b[1]));
        this.lowercaseSearchText = "";

        this.calculateFiltered();
        this.renderFiltered();
    }

    private onElementAdded = (props: UpsertElementProps) => {
        // todo - add to sorted + if filter matches and item is in visible range -> add to items visible in sidebar
    }

    private onElementUpdated = (props: UpsertElementProps) => {
        // todo - if newly discovered -> add or remove from divs accordingly
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

    private onSearchInputChange = (e: InputEvent) => {
        this.lowercaseSearchText = this.searchInput.value.toLowerCase();
        this.onFilterChange();
    }

    private toggleOrder = () => {
        this.showReversed = !this.showReversed;
        this.orderToggleDiv.classList.toggle("toggle-on", this.showReversed);
        this.onFilterChange();
    }

    private toggleHidden = () => {
        this.showHidden = !this.showHidden;
        this.hiddenToggleDiv.classList.toggle("toggle-on", this.showHidden);
        this.onFilterChange();
    }

    private toggleDiscoveries = () => {
        this.showOnlyDiscoveries = !this.showOnlyDiscoveries;
        this.discoveryToggleDiv.classList.toggle("toggle-on", this.showOnlyDiscoveries);
        this.onFilterChange();
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

        // todo - if not showing hidden -> remove from sidebar (if it is still there - might not be) -> otherwise toggle hidden class
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
