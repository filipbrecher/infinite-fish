import type {ElementViewData, ViewDataProps} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import { ElementView } from './ElementView';
import { View } from './View';


export function createView(type: ViewTypeProps, props: ViewDataProps): View {
    switch (type) {
        case ViewTypeProps.Element:
            return new ElementView(props as ElementViewData);
        default:
            throw new Error("Couldn't create view: Unknown type " + type);
    }
}
