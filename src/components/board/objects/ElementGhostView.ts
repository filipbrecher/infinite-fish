

abstract class View {}

export class ElementGhostView extends View {
    private emoji?: string;
    private text: string;

    private div: HTMLDivElement | undefined;

    constructor(text: string) {
        super();
        // todo - make a hook or something
    }

    public getDiv(): HTMLDivElement | undefined {
        // todo
        return;
    }
}
