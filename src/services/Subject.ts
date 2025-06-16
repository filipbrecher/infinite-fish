
export type Listener<T> = (value: T) => void;

export class Subject<T> {
    private listeners: Listener<T>[] = [];

    public notify(value: T) {
        for (const fun of this.listeners) fun(value);
    }

    public subscribe(fun: Listener<T>) {
        this.listeners.push(fun);
    }

    public unsubscribe(fun: Listener<T>) {
        this.listeners = this.listeners.filter(f => f !== fun);
    }
}
