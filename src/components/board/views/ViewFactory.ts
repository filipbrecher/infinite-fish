import type {ElementViewData, GhostElementViewData, ViewDataProps} from "../../../types/db/schema";
import {ViewTypeProps} from "../../../types/db/schema";
import {ElementView} from './ElementView';
import {View} from './View';
import {GhostElementView} from "./GhostElementView";


export function createView(type: ViewTypeProps, props: ViewDataProps): View {
    switch (type) {
        case ViewTypeProps.Element:
            return new ElementView(props as ElementViewData);
        case ViewTypeProps.GhostElement:
            return new GhostElementView(props as GhostElementViewData);
        default:
            throw new Error("Couldn't create view: Unknown type " + type);
    }
}
