import type {Save, Workspace, Element, Instance} from "../types/dbSchema";
import {app} from "../main";
import {Utils} from "./Utils";
import {Subject} from "./Subject";

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

// todo - possibly could make some hook or whatever that when changing saves clears data from memory (like if you have a lot of elements in both of the files)
enum State {
    WAITING = "WAITING",
    LOADING_SAVE = "LOADING_SAVE",
    LOADING_WORKSPACE = "LOADING_WORKSPACE",
    RUNNING = "RUNNING",
}

export class StateService {
    private _saves: Save[];             // all saves
    public get saves() { return this._saves; }
    private _activeSaveId: number;
    private _elements: Element[];
    public get elements() { return this._elements; }
    private _workspaces: Workspace[];   // all workspaces of the active save
    private _activeWorkspaceId: number;
    private _instances: Instance[];

    private _state: State;
    private _overlay: HTMLDivElement;
    private _overlayText: HTMLDivElement;

    public readonly _saveLoaded: Subject = new Subject();
    public readonly _workspaceLoaded: Subject = new Subject();

    constructor() {
        this._overlay = <HTMLDivElement>document.getElementById("state-overlay");
        this._overlayText = <HTMLDivElement>document.getElementById("overlay-text");

        this.setState(State.LOADING_SAVE);
    }

    private setState(s: State) {
        if (this._state === s) return;
        this._state = s;
        console.log("setState to", this._state);

        switch (s) {
            case State.WAITING:
                this._overlayText.innerText = "Waiting to finish combining all elements...";
                this._overlay.style.display = "block";
                break;
            case State.LOADING_SAVE:
                this._overlayText.innerText = "Loading save...";
                this._overlay.style.display = "block";
                break;
            case State.LOADING_WORKSPACE:
                this._overlayText.innerText = "Loading workspace...";
                this._overlay.style.display = "block";
                break;
            case State.RUNNING:
                this._overlay.style.display = "none";
                break;
        }
    }

    public async init() {
        this.setState(State.LOADING_SAVE);

        this._saves = await app.database.loadSaveInfo();
        if (this._saves.length === 0) {
            const newSave = await app.database.createNewSave();
            this._saves.push(newSave);
        }

        const mostRecentSave = <Save>Utils.minBy<Save>(this._saves, save => -save.datetimeUpdated);
        this._activeSaveId = mostRecentSave.id;
        await this.loadActiveSave();
        console.log("loaded elements:", this._elements);
        console.log("loaded workspaces:", this._workspaces);
        console.log("loaded instances:", this._instances);
    }

    public async loadSave(saveId: number) {
        if (saveId === this._activeSaveId) return;

        this.setState(State.WAITING);
        // todo - wait for elements to finish combining
        await Utils.wait(2000);
        this.setState(State.LOADING_SAVE);
        this._activeSaveId = saveId;
        await this.loadActiveSave();
    }

    private async loadActiveSave() {
        this._workspaces = await app.database.getWorkspaces(this._activeSaveId);
        if (this._workspaces.length === 0) {
            const newWs = await app.database.createWorkspace(this._activeSaveId);
            this._workspaces.push(newWs);
        }

        const firstWs = <Workspace>Utils.minBy<Workspace>(this._workspaces, ws => ws.position);
        this._activeWorkspaceId = firstWs.id;

        this._elements = await app.database.getElements(this._activeSaveId);
        this._instances = await app.database.getInstances(this._activeWorkspaceId);

        this._saveLoaded.notify();
        this._workspaceLoaded.notify();
        // todo - sidebar init (or init after reset)
        // todo - load workspaces bar
        // todo - spawn instances
        this.setState(State.RUNNING);
    }

    public async loadWorkspace(workspaceId: number) {
        // todo
    }

    public async createNewSave(): Promise<Save> {
        const newSave = await app.database.createNewSave().catch();
        this._saves.push(newSave);
        return newSave;
    }

    public async deleteSave(id: number): Promise<boolean> {
        try {
            // todo only when the active save isn't this one
            await app.database.deleteSave(id);
            const index = this._saves.findIndex(s => s.id === id);
            if (index !== -1) {
                this._saves.splice(index, 1);
            }
            return true;
        } catch {
            return false;
        }
    }
}
