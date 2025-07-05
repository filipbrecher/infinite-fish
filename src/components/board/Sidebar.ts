import "./sidebar.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import type {ElementProps, SettingsProps} from "../../types/db/schema";
import {DEFAULT_SIDEBAR_WIDTH} from "../../constants/defaults";
import {MAX_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH} from "../../constants/interaction";
import {Sound, State} from "../../types/services";
import type {UpsertElementProps} from "../../types/db/dto";
import {Utils} from "../../services/Utils";
import {SidebarItemWrapper} from "./wrappers/SidebarItemWrapper";


type ElementWithLower = [ElementProps, string];

type Filters = {
    resultLimit: { curr: number, next: number },
    substring: { curr: string, next: string, div: HTMLInputElement },
    reversed: { curr: boolean, next: boolean, div: HTMLDivElement },
    hidden: { curr: boolean, next: boolean, div: HTMLDivElement },
    discovery: { curr: boolean, next: boolean, div: HTMLDivElement },
};

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
    private sidebarItems: SidebarItemWrapper[] = [];

    private unicodeInputWrapper: HTMLDivElement;
    private unicodeInput: HTMLInputElement;
    private unicodeInputButton: HTMLDivElement;
    private lastFocusedInput: HTMLElement;

    private lastCaret = 0;
    private readonly filters: Filters;
    private filterTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.sidebar = document.getElementById("sidebar") as HTMLDivElement;
        this.resizer = document.getElementById("resizer") as HTMLDivElement;
        this.unicodeInputWrapper = document.getElementById("sidebar-search-unicode-input-wrapper") as HTMLDivElement;
        this.unicodeInput = document.getElementById("sidebar-search-unicode-input") as HTMLInputElement;
        this.unicodeInputButton = document.getElementById("sidebar-search-unicode-input-icon") as HTMLDivElement;
        this.sidebarItemsContainer = document.getElementById("sidebar-items") as HTMLDivElement;

        const resultLimit = app.settings.settings.sidebar.resultLimit;
        this.filters = {
            resultLimit: { curr: resultLimit, next: resultLimit },
            substring: { curr: "", next: "", div: document.getElementById("sidebar-search-input") as HTMLInputElement },
            reversed: { curr: false, next: false, div: document.getElementById("sidebar-search-order-icon") as HTMLDivElement },
            hidden: { curr: false, next: false, div: document.getElementById("sidebar-search-hidden-icon") as HTMLDivElement },
            discovery: { curr: false, next: false, div: document.getElementById("sidebar-search-discovery-icon") as HTMLDivElement },
        };
        if ( !app.settings.settings.sidebar.showReverseToggle) this.filters.reversed.div.style.display = "none";
        if ( !app.settings.settings.sidebar.showHiddenToggle) this.filters.hidden.div.style.display = "none";
        if ( !app.settings.settings.sidebar.showDiscoveryToggle) this.filters.discovery.div.style.display = "none";

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
        searchInputDiv.addEventListener('focus', () => this.lastFocusedInput = searchInputDiv);

        // unicode input
        this.unicodeInput.addEventListener("input", this.onUnicodeInputChange);
        this.unicodeInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.unicodeInputButton.click();
        })
        this.unicodeInput.addEventListener('focus', () => this.lastFocusedInput = this.unicodeInput);
        this.unicodeInputButton.addEventListener("click", this.onUnicodeInputClick);
        if (app.settings.settings.sidebar.showUnicodeInput) this.unicodeInputWrapper.style.display = "flex";

        // filters
        this.filters.reversed.div.addEventListener("click", this.toggleOrder);
        this.filters.hidden.div.addEventListener("click", this.toggleHidden);
        this.filters.discovery.div.addEventListener("click", this.toggleDiscoveries);

        // input capture
        this.sidebar.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("block-board-partial", e)(e);
        });
        app.inputCapture.set("sidebar-item", [
            { kind: "mousedown", settingsKey: "elementToggleVisibility", handler: this.onToggleElementVisibility },
        ]);

        // hooks
        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._saveLoaded.subscribe(this.onSaveLoaded);
        app.state._elementAdded.subscribe(this.onElementAdded);
        app.state._elementUpdated.subscribe(this.onElementUpdated);
        app.settings._changed.subscribe(this.onSettingsChanged);
    }

    // first not smaller than target
    private static lowerBound(arr: ElementWithLower[], target: string, targetLow: string, reversed: boolean = false): number {
        let low = 0;
        let high = arr.length;
        const compare = reversed ? (x: number) => x < 0 : (x: number) => x > 0;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (compare(Utils.binaryCompare(targetLow, arr[mid][1]))) low = mid + 1;
            else high = mid;
        }
        while (low < arr.length && arr[low][0].text < target) {
            low++;
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
        let left = this.filters.resultLimit.curr;
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

    private renderFiltered() {
        this.sidebarItemsContainer.innerHTML = "";
        this.sidebarItems = [];
        this.filteredElements.forEach((ewl) => {
            const item = new SidebarItemWrapper(ewl[0]);
            this.sidebarItems.push(item);
            item.mountTo(this.sidebarItemsContainer);
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
        }, app.settings.settings.sidebar.debounce);
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

    private insertInFilteredAtPos(pos: number, ewl: ElementWithLower) {
        this.filteredElements.splice(pos, 0, ewl);
        const item = new SidebarItemWrapper(ewl[0]);
        this.sidebarItems.splice(pos, 0, item);

        if (this.filteredElements.length === 1) {
            item.mountTo(this.sidebarItemsContainer);
        } else {
            const nextSibling = this.sidebarItemsContainer.children[pos] as Node || null;
            item.insertBefore(this.sidebarItemsContainer, nextSibling);
        }

        const limit = this.filters.resultLimit.curr;
        if (this.filteredElements.length > limit && limit !== 0) {
            this.sidebarItemsContainer.lastChild.remove();
            this.sidebarItems.pop();
        }
    }

    private onElementAdded = (props: UpsertElementProps) => {
        const e = app.state.elementsById[props.id];
        const ewl: ElementWithLower = [e, props.text.toLowerCase()];
        const sortedPos = Sidebar.lowerBound(this.sortedElements, ewl[0].text, ewl[1]);
        this.sortedElements.splice(sortedPos, 0, ewl);

        if ( !this.matchesFilter(ewl)) return;
        const limit = this.filters.resultLimit.curr;
        const filteredPos = Sidebar.lowerBound(this.filteredElements, ewl[0].text, ewl[1], this.filters.reversed.curr);
        if (filteredPos >= limit && limit !== 0) return;

        // insert
        this.insertInFilteredAtPos(filteredPos, ewl);
    }

    private onElementUpdated = (props: UpsertElementProps) => {
        if ( !props.discovery) return;
        const e = app.state.elementsById[props.id];
        if (e.hide && !this.filters.hidden) return;

        const sortedPos = Sidebar.lowerBound(this.sortedElements, props.text, props.text.toLowerCase());
        const ewl = this.sortedElements[sortedPos];
        if ( !this.matchesFilter(ewl)) return;

        const limit = this.filters.resultLimit.curr;
        const filteredPos = Sidebar.lowerBound(this.filteredElements, ewl[0].text, ewl[1], this.filters.reversed.curr);
        if (filteredPos >= limit && limit !== 0) return;

        if (this.filters.discovery.curr) {
            // non-discovery changed to discovery when only discovery filter was on -> insert
            this.insertInFilteredAtPos(filteredPos, ewl);
            return;
        }
        if (filteredPos >= this.filteredElements.length) return;
        const item = this.sidebarItems[filteredPos];
        item.setElementDiscovery(true);
    }

    private onSettingsChanged = (changes: Partial<SettingsProps>) => {
        if ( !changes.hasOwnProperty("sidebar")) return;
        const sChanges = changes.sidebar;
        if (sChanges.hasOwnProperty("resultLimit")) {
            this.filters.resultLimit.next = sChanges!.resultLimit;
            this.onFilterChange();
        }
        if (sChanges.hasOwnProperty("showUnicodeInput")) {
            this.unicodeInputWrapper.style.display = sChanges!.showUnicodeInput ? "flex" : "none";
        }
        if (sChanges.hasOwnProperty("showHiddenToggle")) {
            const hidden = this.filters.hidden;
            hidden.div.style.display = sChanges!.showHiddenToggle ? "block" : "none";
            if ( !sChanges!.showHiddenToggle && hidden.next) { // needs to disappear and was turned on
                this.toggleHidden();
            }
        }
        if (sChanges.hasOwnProperty("showDiscoveryToggle")) {
            const discovery = this.filters.discovery;
            discovery.div.style.display = sChanges!.showDiscoveryToggle ? "block" : "none";
            if ( !sChanges!.showDiscoveryToggle && discovery.next) { // needs to disappear and was turned on
                this.toggleHidden();
            }
        }
        if (sChanges.hasOwnProperty("showReverseToggle")) {
            const reversed = this.filters.reversed;
            reversed.div.style.display = sChanges!.showReverseToggle? "block" : "none";
            if ( !sChanges!.showReverseToggle && reversed.next) { // needs to disappear and was turned on
                this.toggleHidden();
            }
        }
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
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const value = input.value;

        input.value = value.slice(0, start) + char + value.slice(end);

        // set caret after inserted char
        this.lastCaret = start + char.length;
        input.setSelectionRange(this.lastCaret, this.lastCaret);

        this.lastFocusedInput?.focus();

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

    public isXOverSidebar = (x: number): boolean => {
        return x >= window.innerWidth - this.width;
    }

    public setDisabled = (disabled: boolean) => {
        if (this.disabled === disabled) return;
        this.disabled = disabled;
        this.sidebar.style.pointerEvents = disabled ? "none" : "auto";
    }

    private onToggleElementVisibility = (e: MouseEvent, props: ElementProps) => {
        e.stopPropagation();

        const pos = Sidebar.lowerBound(this.filteredElements, props.text, props.text.toLowerCase());
        if (this.filteredElements[pos][0].id !== props.id) return;
        const item = this.sidebarItems[pos];
        if ( !this.filters.hidden.curr) {
            this.filteredElements.splice(pos, 1);
            item.removeDiv();
            this.sidebarItems.splice(pos, 1);
            app.state.updateElementVisibility(props.id, true);
            app.audio.play(Sound.POP);
            return;
        }
        item.setElementHide(!props.hide);
        app.state.updateElementVisibility(props.id, !props.hide);
        app.audio.play(Sound.POP);
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
