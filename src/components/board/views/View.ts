import type {ElementViewData, ViewDataProps} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {ElementView} from "./ElementView";


export abstract class View {

    public static getView(type: ViewTypeProps, props: ViewDataProps): View {
        switch (type) {
            case ViewTypeProps.Element:
                return new ElementView(props as ElementViewData) as View;
            default:
                throw new Error("Couldn't create view: Unknown type " + type);
        }
    }

    public static measureUnscaledSize(view: View): [ number, number ] {
        const div = view.getDiv();
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.pointerEvents = 'none';
        div.style.left = '-9999px';
        document.body.appendChild(div);

        const width = div.offsetWidth;
        const height = div.offsetHeight;
        div.remove();

        return [width, height];
    }

    public canCombine(): boolean {
        return false;
    }
    public setCombining(combining: boolean) {}

    abstract getDiv(): HTMLDivElement;
    abstract type(): ViewTypeProps;
    abstract data(): ViewDataProps;
}
