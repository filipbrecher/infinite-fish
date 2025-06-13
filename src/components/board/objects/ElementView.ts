import type {ElementInstanceData} from "../../../types/dbSchema";
import {app} from "../../../main";


export class ElementView {

    public static getDiv(elementId: ElementInstanceData): HTMLDivElement | undefined {
        const div = document.createElement("div");
        div.classList.add("view");
        div.classList.add("element-view");
        const element = app.state.elements.get(elementId);
        if ( !element) return undefined;
        div.innerText = `${element.emoji} ${element.text} ${element.discovery ? "discovery" : ""}`;
        return div;
    }
}
