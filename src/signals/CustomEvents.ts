import type {ViewDataProps} from "../types/dbSchema";
import {ViewTypeProps} from "../types/dbSchema";


export const WORKSPACE_SPAWN_INSTANCE = "workspace:spawn";

export type WorkspaceSpawnEvent = CustomEvent<{
    originalEvent: MouseEvent;
    type?: ViewTypeProps;
    data: ViewDataProps;
}>;
