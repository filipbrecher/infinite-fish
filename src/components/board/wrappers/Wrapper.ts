

export abstract class Wrapper {
    protected _div: HTMLDivElement | undefined;

    protected _disabled: boolean = false;
    public get disabled() { return this._disabled; }

    public setDisabled(disabled: boolean) {
        this._disabled = disabled;
        this._div?.classList.toggle("disabled", disabled);
    }

    public mountTo(container: HTMLDivElement) {
        container.appendChild(this._div);
    }
}
