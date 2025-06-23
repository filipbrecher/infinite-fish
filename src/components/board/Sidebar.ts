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

type Filters = {
    substring: { curr: string, next: string, div: HTMLInputElement },
    reversed: { curr: boolean, next: boolean, div: HTMLDivElement },
    hidden: { curr: boolean, next: boolean, div: HTMLDivElement },
    discovery: { curr: boolean, next: boolean, div: HTMLDivElement },
};

// todo - toggles hideable via settings
// todo - subscribe to state for _elementAdded and _elementUpdated
// todo - add input captures:
//      (onViewCopyEmojiText, onViewInfo, elementToggleVisibility)
export class Sidebar implements IComponent {
    private readonly sidebar: HTMLDivElement;
    private disabled: boolean = false;

    private readonly resizer: HTMLDivElement;
    private width: number = DEFAULT_SIDEBAR_WIDTH;
    private isResizing = false;

    private readonly sidebarItemsContainer: HTMLDivElement;
    // all elements (sorted by mixed case, with lower case cached)
    private sortedElements: ElementWithLower[] = [];
    // current filtered list shown in sidebar (sorted by mixed case + reversed if filter set)
    private filteredElements: ElementWithLower[] = [];
    private sidebarItems: ItemWrapper[] = [];

    private unicodeInputWrapper: HTMLDivElement;
    private unicodeInput: HTMLInputElement;
    private unicodeInputButton: HTMLDivElement;

    private lastCaret = 0;
    private readonly filters: Filters;
    private filterTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.sidebar = document.getElementById("sidebar") as HTMLDivElement;
        this.resizer = document.getElementById("resizer") as HTMLDivElement;
        this.unicodeInputWrapper = document.getElementById("sidebar-search-unicode-input-wrapper") as HTMLDivElement;
        this.unicodeInput = document.getElementById("sidebar-search-unicode-input") as HTMLInputElement;
        this.unicodeInputButton = document.getElementById("sidebar-search-unicode-input-button") as HTMLDivElement;
        this.sidebarItemsContainer = document.getElementById("sidebar-items") as HTMLDivElement;

        this.filters = {
            substring: { curr: "", next: "", div: document.getElementById("sidebar-search-input") as HTMLInputElement },
            reversed: { curr: false, next: false, div: document.getElementById("sidebar-search-toggle-order") as HTMLDivElement },
            hidden: { curr: false, next: false, div: document.getElementById("sidebar-search-toggle-hidden") as HTMLDivElement },
            discovery: { curr: false, next: false, div: document.getElementById("sidebar-search-toggle-discovery") as HTMLDivElement },
        };
        if ( !app.settings.settings.searchShowReverseToggle) this.filters.reversed.div.style.display = "none";
        if ( !app.settings.settings.searchShowHiddenToggle) this.filters.hidden.div.style.display = "none";
        if ( !app.settings.settings.searchShowDiscoveryToggle) this.filters.discovery.div.style.display = "none";

        // resizer
        document.documentElement.style.setProperty("--sidebar-width", `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onStartResizing);

        // input
        window.addEventListener("keydown", this.onKeyDown);
        const searchInputDiv = this.filters.substring.div;
        searchInputDiv.addEventListener("blur", () => {
            this.lastCaret = searchInputDiv.selectionStart ?? 0;
        });
        searchInputDiv.addEventListener("input", this.onSearchInputChange);

        // unicode input
        this.unicodeInput.addEventListener("input", this.onUnicodeInputChange);
        this.unicodeInputButton.addEventListener("click", this.onUnicodeInputClick);
        if (app.settings.settings.searchShowUnicodeInput) this.unicodeInputWrapper.style.display = "block";

        // filters
        this.filters.reversed.div.addEventListener("click", this.toggleOrder);
        this.filters.hidden.div.addEventListener("click", this.toggleHidden);
        this.filters.discovery.div.addEventListener("click", this.toggleDiscoveries);

        // input capture
        this.sidebar.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("sidebar", e)(e);
        });
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

        // hooks
        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._saveLoaded.subscribe(this.onSaveLoaded);
        app.state._elementAdded.subscribe(this.onElementAdded);
        app.state._elementUpdated.subscribe(this.onElementUpdated);
    }

    private static lowerBound(arr: ElementWithLower[], target: string, reversed: boolean = false): number {
        let low = 0;
        let high = arr.length;
        const compare = reversed ? (x: number) => x <= 0 : (x: number) => x >= 0;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (compare(Utils.binaryCompare(target, arr[mid][1]))) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    private matchesFilter(ewl: ElementWithLower): boolean {
        if ( !ewl[1].includes(this.filters.substring.curr)) return false;
        if ( !this.filters.hidden.curr && ewl[0].hide) return false;
        if (this.filters.discovery.curr && !ewl[0].discovery) return false;
        return true;
    }

    private calculateFiltered() {
        let left = app.settings.settings.searchResultLimit;
        this.filteredElements = [];

        const reversed = this.filters.reversed.curr;
        const inc = reversed ? -1 : 1;
        for (let i = reversed ? this.sortedElements.length - 1 : 0; reversed ? i >= 0 : i < this.sortedElements.length; i += inc) {
            const ewl = this.sortedElements[i];
            if (this.matchesFilter(ewl)) {
                this.filteredElements.push(ewl);
                if (--left === 0) break;
            }
        }
    }

    private static getItemAndDiv(ewl: ElementWithLower): [ItemWrapper, HTMLDivElement] {
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
        return [item, itemDiv];
    }

    private renderFiltered() {
        this.sidebarItemsContainer.innerHTML = "";
        this.sidebarItems = [];
        this.filteredElements.forEach((ewl) => {
            const [item, itemDiv] = Sidebar.getItemAndDiv(ewl);
            this.sidebarItems.push(item);
            this.sidebarItemsContainer.appendChild(itemDiv);
        });
    }

    private onFilterChange() {
        if (this.filterTimeout) clearTimeout(this.filterTimeout);

        this.filterTimeout = setTimeout(() => {
            // todo - optimise

            let changed = false;
            Object.values(this.filters).forEach(f => {
                if (f.curr === f.next) return;
                changed = true;
                f.curr = f.next;
            });
            if ( !changed) return;

            this.calculateFiltered();
            this.renderFiltered();
        }, app.settings.settings.searchResultDebounce);
    }

    private onSaveUnloaded = () => {
        this.lastCaret = 0;
        this.filters.substring.div.value = "";
        this.filters.substring.curr = "";
        this.filters.substring.next = "";
        this.sidebarItemsContainer.innerHTML = "";
        this.sortedElements = [];
        this.filteredElements = [];
        this.sidebarItems = [];
    }

    private onSaveLoaded = () => {
        this.sortedElements = app.state.elementsById
            .filter(e => e !== undefined)
            .map(e => [e, e.text.toLowerCase()]);
        this.sortedElements.sort((a, b) => Utils.binaryCompare(a[1], b[1]));

        this.calculateFiltered();
        this.renderFiltered();
    }

    private onElementAdded = (props: UpsertElementProps) => {
        const ewl: ElementWithLower = [props, props.text.toLowerCase()];
        const sortedPos = Sidebar.lowerBound(this.sortedElements, ewl[1]);
        this.sortedElements.splice(sortedPos, 0, ewl);

        if ( !this.matchesFilter(ewl)) return;
        const limit = app.settings.settings.searchResultLimit;
        const filteredPos = Sidebar.lowerBound(this.filteredElements, ewl[1], this.filters.reversed.curr);
        if (filteredPos >= limit) return;

        // insert
        this.filteredElements.splice(filteredPos, 0, ewl);
        const [item, itemDiv] = Sidebar.getItemAndDiv(ewl);
        this.sidebarItems.splice(filteredPos, 0, item);

        if (this.filteredElements.length === 1) {
            this.sidebarItemsContainer.appendChild(itemDiv);
        } else {
            const nextSibling = this.sidebarItemsContainer.children[filteredPos] as Node || null;
            this.sidebarItemsContainer.insertBefore(itemDiv, nextSibling);
        }

        if (this.filteredElements.length > limit) {
            this.sidebarItemsContainer.lastChild.remove();
            this.sidebarItems.pop();
        }
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

    private onSearchInputChange = () => {
        this.filters.substring.next = this.filters.substring.div.value.toLowerCase();
        this.onFilterChange();
    }

    private onUnicodeInputChange = () => {
        const raw = this.unicodeInput.value.toLowerCase();
        let caret = this.unicodeInput.selectionStart ?? raw.length;

        let cleaned = "";
        let j = 0;

        for (let i = 0; i < raw.length; i++) {
            const c = raw[i];
            if (/[0-9a-fA-F]/.test(c)) {
                cleaned += c.toLowerCase();
                if (++j === 6) break;
            } else if (i < caret) {
                caret--;
            }
        }
        caret = Math.min(caret, 6);

        if (cleaned.length === 6) {
            if (cleaned[0] !== "0" && !(cleaned[0] === "1" && cleaned[1] === "0")) {
                cleaned = cleaned.slice(0, 5);
            }
        }

        this.unicodeInput.value = cleaned;
        this.unicodeInput.setSelectionRange(caret, caret);
    }

    private onUnicodeInputClick = () => {
        const raw = this.unicodeInput.value;
        const codepoint = Number(`0x${raw}`);
        if (isNaN(codepoint)) return;
        const char = String.fromCodePoint(codepoint);

        const input = this.filters.substring.div;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        const value = input.value;

        input.value = value.slice(0, start) + char + value.slice(end);

        // set caret after inserted char
        const caretPos = start + char.length;
        input.setSelectionRange(caretPos, caretPos);
        input.focus();

        this.onSearchInputChange();
    }

    private toggleOrder = () => {
        const reversed = this.filters.reversed;
        reversed.next = !reversed.next;
        reversed.div.classList.toggle("toggle-on", reversed.next);
        this.onFilterChange();
    }

    private toggleHidden = () => {
        const hidden = this.filters.hidden;
        hidden.next = !hidden.next;
        hidden.div.classList.toggle("toggle-on", hidden.next);
        this.onFilterChange();
    }

    private toggleDiscoveries = () => {
        const discovery = this.filters.discovery;
        discovery.next = !discovery.next;
        discovery.div.classList.toggle("toggle-on", discovery.next);
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
        if (document.activeElement === this.filters.substring.div) return;

        // don't steal focus if user is typing elsewhere
        const active = document.activeElement;
        const isTyping = active && (
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.getAttribute("contenteditable") === "true"
        );
        if (isTyping) return;

        this.filters.substring.div.focus();
        this.filters.substring.div.setSelectionRange(this.lastCaret, this.lastCaret);
    }
}
