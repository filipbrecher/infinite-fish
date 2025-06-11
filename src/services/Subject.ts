
export type Listener = () => void;

export class Subject {
    private listeners: Listener[] = [];

    public notify() {
        for (const fun of this.listeners) fun();
    }

    public subscribe(fun: Listener) {
        this.listeners.push(fun);
    }

    public unsubscribe(fun: Listener) {
        this.listeners = this.listeners.filter(f => f !== fun);
    }
}
