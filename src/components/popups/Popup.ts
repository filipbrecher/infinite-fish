

export abstract class Popup<T> {
    protected _popup: HTMLDivElement;
    public get popup() { return this._popup; }

    protected constructor() {}

    abstract open(props: T): void;
    abstract close(): void;
}
