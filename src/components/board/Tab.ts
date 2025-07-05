import {MAX_WORKSPACE_NAME_LENGTH} from "../../constants/save";
import type {WorkspaceProps} from "../../types/db/schema";


export class Tab {
    private readonly _wrapper: HTMLDivElement;
    public get wrapper() { return this._wrapper; }
    private readonly _span: HTMLSpanElement;
    private readonly _input: HTMLInputElement;
    public get input() { return this._input; }

    private _editing: boolean = false;
    public get editing() { return this._editing; }

    constructor() {
        this._wrapper = document.createElement("div") as HTMLDivElement;
        this._wrapper.classList.add("tab-wrapper");

        const dots = document.createElement("div") as HTMLDivElement;
        dots.classList.add("tab-dots");
        dots.classList.add("icon");
        dots.classList.add("mask-icon");
        dots.classList.add("button-icon");

        this._span = document.createElement("span") as HTMLSpanElement;
        this._span.classList.add("tab-name");
        this._input = document.createElement("input") as HTMLInputElement;
        this._input.classList.add("tab-name");
        this._input.type = "text";
        this._input.maxLength = MAX_WORKSPACE_NAME_LENGTH;
        this._input.autocomplete = "off";
        this._input.spellcheck = false;
        this._input.addEventListener("input", () => {
            this.setName(this._input.value);
        });
        this._span.classList.toggle("hide", false);
        this._input.classList.toggle("hide", true);

        this._wrapper.append(dots, this._span, this._input);
    }

    public setName = (text: string) => {
        const sliced = text.slice(0, MAX_WORKSPACE_NAME_LENGTH);
        this._input.value = sliced;
        this._span.textContent = sliced;
        const newWidth = this._span.offsetWidth - 16;
        this._input.style.width = `${newWidth}px`;
    }

    public insertBefore(container: HTMLDivElement, nextSibling: Node | null) {
        container.insertBefore(this._wrapper, nextSibling);
    }

    public remove() {
        this._wrapper.remove();
    }

    public setActive(active: boolean) {
        this._wrapper.classList.toggle("active", active);
    }

    public startEditing() {
        if (this._editing) return;
        this._editing = true;
        this._span.classList.toggle("hide", true);
        this._input.classList.toggle("hide", false);
        this._input.focus();
        const len = this._span.innerText.length;
        this._input.setSelectionRange(len, len);
    }

    public endEditing() {
        if ( !this._editing) return;
        this._editing = false;
        this._span.classList.toggle("hide", false);
        this._input.classList.toggle("hide", true);
    }
}