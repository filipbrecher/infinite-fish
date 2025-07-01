import {View} from "./View";
import type {GhostElementViewData} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {app} from "../../../main";


export class GhostElementView extends View {
    private readonly _emoji?: string;
    private readonly _text: string;

    constructor(props: GhostElementViewData) {
        super();
        // todo - make a hook or something + event listener (inputcapture)?
        this._div = document.createElement("div");
        this._emoji = props.emoji || "";
        this._text = props.text;

        this._div = document.createElement("div");

        this._div.classList.add("view");
        this._div.classList.add("ghost-element-view");

        if (this._emoji && this._emoji.length !== 0) {
            const emojiSpan = document.createElement("span");
            emojiSpan.classList.add("emoji");
            emojiSpan.innerText = this._emoji;
            const separatorSpan = document.createElement("span");
            separatorSpan.classList.add("separator");
            this._div.append(emojiSpan, separatorSpan);
        }

        const textSpan = document.createElement("span");
        textSpan.classList.add("text");
        textSpan.innerText = this._text;
        this._div.appendChild(textSpan);

        this._div.addEventListener("mousedown", (e: MouseEvent) => {
            let str = (e.target as HTMLElement).classList.contains("emoji") ? this._emoji : this._text;
            app.inputCapture.matchMouseDown("ghost-element-view", e)(e, str);
        });
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
