import type {
    SaveProps,
    WorkspaceProps,
    ElementProps,
    InstanceProps,
    WorkspaceChangesProps,
    NewInstanceProps, InstanceMoveProps
} from "../types/dbSchema";
import {app} from "../main";
import {Utils} from "./Utils";
import {Subject} from "../signals/Subject";
import {SAVE_ACTIVE_AT_TIMEOUT} from "../constants/defaults";
import {InstanceWrapper} from "../components/board/instances/InstanceWrapper";
import {COMBINE_ELEMENTS} from "../config";

// on page load -> after db is initialized and settings are loaded (.init method)
// 1) state := loading
// 2) load saves info
// 3) if no save -> create new default save
// 4) load most recent save (start with point 3 below)

// on change of played save
// 1) state := waiting (for all elements that are still combining to combine)
// 2) state := loading_save
// (bonus) clear instances/workspace/elements from memory (or maybe that is just overcomplicating things)
// 3) set activeSaveId to this save's id
// 4) load workspace info of active save
// 5) if no workspace -> create new default workspace
// 6) set activeWorkspaceId to the workspace with position 1 (first position)
// 7) load all elements from the active save into memory
// 8) load all instances from the active workspace into memory
// 9) activate sidebar with elements
// 10) setup workspaces (like the bar at the top showing active workspace and allowing to select other workspaces)
// 11) add instances to the board
// last) state := running

// on change of workspaces
// 1) state := waiting (for elements that are still combining to combine)
// 2) state := loading_workspace
// 5) set activeWorkspaceId to the new workspace
// 6) load all instances from the active workspace into memory
// 7) add instances to the board
// last) state := running

enum State {
    WAITING = "WAITING",
    LOADING_SAVE = "LOADING_SAVE",
    LOADING_WORKSPACE = "LOADING_WORKSPACE",
    RUNNING = "RUNNING",
}


// todo - make sure everywhere is accounted for possible instances not found by their id
//        add app logger logs for edge cases / errors
// todo - block and debounce on block text
export class StateService {
    private _saves: Map<number, SaveProps> = new Map();             // all saves
    private _activeSave: SaveProps | undefined;
    private _elementsById: ElementProps[] = [];
    private _elementsByText: Map<string, ElementProps> = new Map();
    private _workspaces: Map<number, WorkspaceProps> = new Map();   // all workspaces of the active save
    private _activeWorkspace: WorkspaceProps | undefined;
    private _instances: Map<number, InstanceProps> = new Map();
    public get saves() { return this._saves; }
    public get activeSave() { return this._activeSave; }
    public get elementsById() { return this._elementsById; }
    public get elementsByText() { return this._elementsByText; }
    public get workspaces() { return this._workspaces; }
    public get activeWorkspace() { return this._activeWorkspace; }
    public get instances() { return this._instances; }

    private _maxElementId: number;
    private _maxInstanceId: number;

    private _state: State;
    private _overlay: HTMLDivElement;
    private _overlayText: HTMLDivElement;

    public readonly _stateWaiting: Subject<void> = new Subject();
    public readonly _saveUnloaded: Subject<SaveProps> = new Subject();
    public readonly _saveLoaded: Subject<SaveProps> = new Subject();
    public readonly _workspaceUnloaded: Subject<WorkspaceProps> = new Subject();
    public readonly _workspaceTransformed: Subject<Partial<WorkspaceChangesProps>> = new Subject();
    public readonly _instancesMoved: Subject<InstanceMoveProps[]> = new Subject();
    public readonly _instancesDeleted: Subject<number[]> = new Subject();
    public readonly _instancesCreated: Subject<InstanceProps[]> = new Subject();
    public readonly _workspaceLoaded: Subject<WorkspaceProps> = new Subject();

    constructor() {
        this._overlay = document.getElementById("state-overlay") as HTMLDivElement;
        this._overlayText = document.getElementById("overlay-text") as HTMLDivElement;

        this.setState(State.LOADING_SAVE);
        this.updateActiveTimeLoop();
    }

    private updateActiveTimeLoop = () => {
        setTimeout(() => {
            this.updateActiveTime();
            this.updateActiveTimeLoop();
        }, SAVE_ACTIVE_AT_TIMEOUT);
    }

    private updateActiveTime = () => {
        if ( !this._activeSave) return;
        const newTime = Date.now();
        app.database.updateActiveTimeOfSave(this._activeSave.id, newTime).catch();
        this._activeSave.datetimeActive = newTime;
    }

    private setState(s: State) {
        if (this._state === s) return;
        this._state = s;

        switch (s) {
            case State.WAITING:
                this._overlayText.innerText = "Waiting to finish combining all elements...";
                this._overlay.classList.add("visible");
                this._stateWaiting.notify();
                break;
            case State.LOADING_SAVE:
                this._overlayText.innerText = "Loading save...";
                this._overlay.classList.add("visible");
                break;
            case State.LOADING_WORKSPACE:
                this._overlayText.innerText = "Loading workspace...";
                this._overlay.classList.add("visible");
                break;
            case State.RUNNING:
                this._overlay.classList.remove("visible");
                break;
        }
    }

    public async init() {
        this.setState(State.LOADING_SAVE);

        const savesArr = await app.database.loadSaveInfo();
        this._saves = new Map(savesArr.map(save => [save.id, save]));
        if (this._saves.size === 0) {
            const newSave = await app.database.createNewSave();
            this._saves.set(newSave.id, newSave);
        }

        const mostRecentSave = Utils.minBy<SaveProps>(this._saves, save => -save.datetimeActive) as SaveProps;
        await this.loadActiveSave(mostRecentSave.id);
    }

    public async loadSave(saveId: number) {
        if (saveId === this._activeSave?.id) return;

        await this.waitForElementsToCombine();
        this.setState(State.LOADING_SAVE);

        this._workspaceUnloaded.notify(this._activeWorkspace!);
        this._saveUnloaded.notify(this._activeSave!);
        this.clearSaveFromMemory();

        await this.loadActiveSave(saveId);
    }

    private async loadActiveSave(activeSaveId: number) {
        this._activeSave = this._saves.get(activeSaveId);

        const workspacesArr = await app.database.getWorkspaces(activeSaveId);
        this._workspaces = new Map(workspacesArr.map(ws => [ws.id, ws]));
        this._activeWorkspace = this._workspaces.get(this._activeSave!.lastActiveWorkspaceId);

        await this.loadElements(this._activeSave!.id);
        await this.loadInstances(this._activeWorkspace!.id);
        this.updateActiveTime();

        this._saveLoaded.notify(this._activeSave!);
        this._workspaceLoaded.notify(this._activeWorkspace!);
        this.setState(State.RUNNING);
    }

    public async loadWorkspace(workspaceId: number) {
        if (workspaceId === this._activeWorkspace?.id) return;

        await this.waitForElementsToCombine();
        this.setState(State.LOADING_WORKSPACE);

        this._workspaceUnloaded.notify(this._activeWorkspace!);
        this.clearWorkspaceFromMemory();

        await this.loadActiveWorkspace(workspaceId);
    }

    private async loadActiveWorkspace(activeWsId: number) {
        this._activeWorkspace = this._workspaces.get(activeWsId);

        await this.loadInstances(this._activeWorkspace!.id);

        this._workspaceLoaded.notify(this._activeWorkspace!);
        this.setState(State.RUNNING);
        this._activeSave!.lastActiveWorkspaceId = activeWsId;
        app.database.updateLastActiveWsOfSave(this._activeSave!.id, activeWsId).catch();
    }

    private async waitForElementsToCombine() {
        this.setState(State.WAITING);
        // todo - wait for elements to finish combining
        await Utils.wait(500);
    }

    private clearSaveFromMemory() {
        this._activeSave = undefined;
        this._activeWorkspace = undefined;
        this._elementsById = [];
        this._elementsByText = new Map();
        this._workspaces = new Map();
        this._instances = new Map();
    }

    private clearWorkspaceFromMemory() {
        this._activeWorkspace = undefined;
        this._instances = new Map();
    }

    private async loadElements(activeSaveId: number) {
        const elements = await app.database.getElements(activeSaveId);
        this._elementsById = [];
        this._elementsByText = new Map();
        this._maxElementId = -1;
        elements.forEach(e => {
            this._elementsById[e.id] = e;
            this._elementsByText.set(e.text, e);
            this._maxElementId = Math.max(this._maxElementId, e.id);
        });
    }

    private async loadInstances(activeWorkspaceId: number) {
        const instancesArr = await app.database.getInstances(activeWorkspaceId);
        this._maxInstanceId = -1;
        this._instances = new Map(instancesArr.map(i => {
            this._maxInstanceId = Math.max(this._maxInstanceId, i.id);
            return [i.id, i];
        }));
    }

    public async createNewSave(): Promise<SaveProps> {
        const newSave = await app.database.createNewSave().catch();
        this._saves.set(newSave.id, newSave);
        return newSave;
    }

    public async deleteSave(id: number): Promise<boolean> {
        try {
            if (this.activeSave?.id === id) return false;
            await app.database.deleteSave(id);
            this._saves.delete(id);
            return true;
        } catch {
            return false;
        }
    }

    // todo - debounce db
    public updateWorkspace(changes: Partial<WorkspaceChangesProps>): void {
        if (changes.x !== undefined) this.activeWorkspace!.x = changes.x;
        if (changes.y !== undefined) this.activeWorkspace!.y = changes.y;
        if (changes.scale !== undefined) this.activeWorkspace!.scale = changes.scale;
        this._workspaceTransformed.notify(changes);
        app.database.updateWorkspace(this._activeWorkspace!.id, changes).catch();
    }

    // todo - debounce db
    public moveInstances(toMove: InstanceWrapper[]): void {
        const moved: InstanceMoveProps[] = [];
        toMove.forEach(i => {
            const moveProps = i.getMoveProps();
            const j = this.instances.get(moveProps.id);
            if ( !j) return;
            moved.push(moveProps);
            j.x = moveProps.x;
            j.y = moveProps.y;
            j.zIndex = moveProps.zIndex;
        });
        this._instancesMoved.notify(moved);
        app.database.moveInstances(moved).catch();
    }

    public deleteInstances(ids: Set<number>): void {
        const deleted: number[] = [];
        ids.forEach(id => {
            if (this.instances.delete(id)) {
                deleted.push(id);
            }
        });
        this._instancesDeleted.notify(deleted);
        app.database.applyInstanceChanges(this._activeWorkspace!.id, deleted).catch();
    }

    public createInstances(instances: NewInstanceProps[]): InstanceProps[] {
        instances.forEach((i: InstanceProps) => {
            i.workspaceId = this._activeWorkspace!.id;
            i.id = ++this._maxInstanceId;
            this._instances.set(i.id, i);
        });
        this._instancesCreated.notify(instances as InstanceProps[]);
        app.database.applyInstanceChanges(this._activeWorkspace!.id, undefined, instances as InstanceProps[]).catch();
        return instances as InstanceProps[];
    }

    public createInstance(instance: NewInstanceProps): InstanceProps {
        const newInstance: InstanceProps = instance as InstanceProps;
        newInstance.workspaceId = this._activeWorkspace!.id;
        newInstance.id = ++this._maxInstanceId;

        this._instances.set(newInstance.id, newInstance);
        this._instancesCreated.notify([newInstance]);

        app.database.applyInstanceChanges(this._activeWorkspace!.id, undefined, [newInstance]).catch();
        return newInstance;
    }

    public async combineElements(i1: { id: number, text: string }, i2: { id: number, text: string }): Promise<void> {
        const res = await fetch(`${COMBINE_ELEMENTS}?first=${encodeURIComponent(i1.text)}&second=${encodeURIComponent(i2.text)}`);
        const data = await res.json();
        console.log(data);
        return;
    }
}
