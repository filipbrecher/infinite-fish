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

    abstract getDiv(): HTMLDivElement;
}
