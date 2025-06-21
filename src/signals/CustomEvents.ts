import type {ViewDataProps} from "../types/db/schema";
import {ViewTypeProps} from "../types/db/schema";


export const WORKSPACE_SPAWN_INSTANCE = "workspace:spawn";

export type WorkspaceSpawnEvent = CustomEvent<{
    originalEvent: MouseEvent;
    type?: ViewTypeProps;
    data: ViewDataProps;
}>;
