import type {InstanceDataProps} from "../../../types/dbSchema";
import {InstanceTypeProps} from "../../../types/dbSchema";
import {ElementView} from "./ElementView";


export class View {

    public static getDiv(type: InstanceTypeProps, props: InstanceDataProps): HTMLDivElement | undefined {
        switch (type) {
            case InstanceTypeProps.Element:
                return ElementView.getDiv(props);
            default:
                throw new Error("Couldn't create view: Unknown type " + type);
        }
    }
}
