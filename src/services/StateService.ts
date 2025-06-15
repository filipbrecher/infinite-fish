import type {SaveProps, WorkspaceProps, ElementProps, InstanceProps, WorkspaceChangesProps} from "../types/dbSchema";
import {app} from "../main";
import {Utils} from "./Utils";
import {Subject} from "./Subject";
import {SAVE_ACTIVE_AT_TIMEOUT} from "../constants/defaults";

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

// todo - block and debounce on block text
export class StateService {
    private _saves: Map<number, SaveProps> = new Map();             // all saves
    private _activeSave: SaveProps | undefined;
    private _elements: Map<number, ElementProps> = new Map();
    private _workspaces: Map<number, WorkspaceProps> = new Map();   // all workspaces of the active save
    private _activeWorkspace: WorkspaceProps | undefined;
    private _instances: Map<number, InstanceProps> = new Map();
    public get saves() { return this._saves; }
    public get activeSave() { return this._activeSave; }
    public get elements() { return this._elements; }
    public get workspaces() { return this._workspaces; }
    public get activeWorkspace() { return this._activeWorkspace; }
    public get instances() { return this._instances; }

    private _state: State;
    private _overlay: HTMLDivElement;
    private _overlayText: HTMLDivElement;

    public readonly _saveUnloaded: Subject = new Subject();
    public readonly _saveLoaded: Subject = new Subject();
    public readonly _workspaceUnloaded: Subject = new Subject();
    public readonly _workspaceTransformed: Subject = new Subject();
    public readonly _workspaceLoaded: Subject = new Subject();

    constructor() {
        this._overlay = <HTMLDivElement>document.getElementById("state-overlay");
        this._overlayText = <HTMLDivElement>document.getElementById("overlay-text");

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

        const mostRecentSave = <SaveProps>Utils.minBy<SaveProps>(this._saves, save => -save.datetimeActive);
        await this.loadActiveSave(mostRecentSave.id);
    }

    public async loadSave(saveId: number) {
        if (saveId === this._activeSave?.id) return;

        await this.waitForElementsToCombine();
        this.setState(State.LOADING_SAVE);

        this.clearSaveFromMemory();
        this._workspaceUnloaded.notify();
        this._saveUnloaded.notify();

        await this.loadActiveSave(saveId);
    }

    private async loadActiveSave(activeSaveId: number) {
        const workspacesArr = await app.database.getWorkspaces(activeSaveId);
        this._workspaces = new Map(workspacesArr.map(ws => [ws.id, ws]));
        if (this._workspaces.size === 0) {
            const newWs = await app.database.createWorkspace(activeSaveId);
            this._workspaces.set(newWs.id, newWs);
        }

        const activeWsId = (<WorkspaceProps>Utils.minBy<WorkspaceProps>(this._workspaces, ws => ws.position)).id;

        const elementsArr = await app.database.getElements(activeSaveId);
        this._elements = new Map(elementsArr.map(e => [e.id, e]));
        const instancesArr = await app.database.getInstances(activeWsId);
        this._instances = new Map(instancesArr.map(i => [i.id, i]));

        this._activeSave = this._saves.get(activeSaveId);
        this._activeWorkspace = this._workspaces.get(activeWsId);
        this.updateActiveTime();

        this._saveLoaded.notify();
        this._workspaceLoaded.notify();
        this.setState(State.RUNNING);
    }

    public async loadWorkspace(workspaceId: number) {
        if (workspaceId === this._activeWorkspace?.id) return;

        await this.waitForElementsToCombine();
        this.setState(State.LOADING_WORKSPACE);

        this.clearWorkspaceFromMemory();
        this._workspaceUnloaded.notify();

        await this.loadActiveWorkspace(workspaceId);
    }

    private async loadActiveWorkspace(activeWsId: number) {
        const instancesArr = await app.database.getInstances(activeWsId);
        this._instances = new Map(instancesArr.map(i => [i.id, i]));

        this._activeWorkspace = this._workspaces.get(activeWsId);
        this._workspaceLoaded.notify();
        this.setState(State.RUNNING);
    }

    private async waitForElementsToCombine() {
        this.setState(State.WAITING);
        // todo - wait for elements to finish combining
        await Utils.wait(500);
    }

    private clearSaveFromMemory() {
        this._activeSave = undefined;
        this._activeWorkspace = undefined;
        this._elements = new Map();
        this._workspaces = new Map();
        this._instances = new Map();
    }

    private clearWorkspaceFromMemory() {
        this._activeWorkspace = undefined;
        this._instances = new Map();
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

    // todo - debounce
    public updateWorkspace(changes: Partial<WorkspaceChangesProps>): void {
        if (changes.x) this.activeWorkspace!.x = changes.x;
        if (changes.y) this.activeWorkspace!.y = changes.y;
        if (changes.scale) this.activeWorkspace!.scale = changes.scale;
        this._workspaceTransformed.notify();
        app.database.updateWorkspace(this._activeWorkspace!.id, changes).catch();
    }
}
