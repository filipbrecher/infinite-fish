import {View} from "./View";
import {GhostElementViewData, ViewTypeProps} from "../../../types/db/schema";


export class ElementGhostView extends View {
    private _emoji?: string;
    private _text: string;

    constructor(text: string) {
        super();
        // todo - make a hook or something + event listener (inputcapture)?
        this._div = document.createElement("div"); // todo
    }

    public mountTo(container: HTMLDivElement): void {
        container.appendChild(this._div);
    }

    public data(): GhostElementViewData {
        return {
            emoji: this._emoji || "",
            text: this._text,
        };
    }

    public type(): ViewTypeProps {
        return ViewTypeProps.GhostElement;
    }
}
