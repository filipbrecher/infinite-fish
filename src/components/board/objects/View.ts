import type {InstanceDataProps} from "../../../types/dbSchema";
import {InstanceTypeProps} from "../../../types/dbSchema";
import {ElementView} from "./ElementView";


export abstract class View {

    public static getView(type: InstanceTypeProps, props: InstanceDataProps): View {
        switch (type) {
            case InstanceTypeProps.Element:
                return new ElementView(props);
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

    abstract getDiv(): HTMLDivElement;
    abstract type(): InstanceTypeProps;
    abstract data(): InstanceDataProps;
}
