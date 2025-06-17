import type {InstanceDataProps} from "../types/dbSchema";
import {InstanceTypeProps} from "../types/dbSchema";


export const WORKSPACE_SPAWN_INSTANCE = "workspace:spawn";

export type WorkspaceSpawnEvent = CustomEvent<{
    originalEvent: MouseEvent;
    type?: InstanceTypeProps;
    data: InstanceDataProps;
}>;
