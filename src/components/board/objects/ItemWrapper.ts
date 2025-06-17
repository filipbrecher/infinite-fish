import {View} from "./View";
import type {InstanceDataProps} from "../../../types/dbSchema";


export class ItemWrapper {
    private view: View;
    private div: HTMLDivElement | undefined;

    constructor(view: View) {
        this.view = view;
    }

    public getDiv(): HTMLDivElement {
        this.div = document.createElement("div");
        this.div.classList.add("item-wrapper");
        return this.div;
    }

    public removeDiv() {
        this.div?.remove();
    }

    public getData(): InstanceDataProps {
        return this.view.data();
    }
}
