import type {ElementProps, InstanceProps, RecipeProps, SaveProps, WorkspaceProps} from "../types/db/schema";
import type {InstanceMoveProps, NewInstanceProps, UpsertElementProps, WorkspaceChangesProps} from "../types/db/dto";
import {app} from "../main";
import {Utils} from "./Utils";
import {Subject} from "../signals/Subject";
import {SAVE_ACTIVE_AT_TIMEOUT} from "../constants/save";
import {InstanceWrapper} from "../components/board/wrappers/InstanceWrapper";
import {CHECK_RECIPE, COMBINE_ELEMENTS} from "../constants/api";
import {State} from "../types/services";
import type {CheckRecipeResponse, CombineElementsResponse} from "../types/api";

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

    // db indexing
    private _maxElementId: number;
    private _maxInstanceId: number;

    private _newElementPendingUpsert: Map<string, number> = new Map(); // id of new elements that are being added to db (in transaction)

    // combineQueue
    private _queuedCombinations: number = 0;
    private _queueDoneCallback: () => void = () => {};


    private _state: State;
    public get state() { return this._state; }
    private _overlay: HTMLDivElement;
    private _overlayText: HTMLDivElement;

    public readonly _stateWaiting: Subject<void> = new Subject();
    public readonly _saveUnloaded: Subject<SaveProps> = new Subject();
    public readonly _saveLoaded: Subject<SaveProps> = new Subject();
    public readonly _workspaceUnloaded: Subject<WorkspaceProps> = new Subject();
    public readonly _workspaceLoaded: Subject<WorkspaceProps> = new Subject();
    public readonly _workspaceCreated: Subject<WorkspaceProps> = new Subject();
    public readonly _workspaceMoved: Subject<{ from: number, ws: WorkspaceProps, targetWs: WorkspaceProps }> = new Subject();
    public readonly _workspaceTransformed: Subject<Partial<WorkspaceChangesProps>> = new Subject();
    public readonly _workspaceDeleted: Subject<WorkspaceProps> = new Subject();
    public readonly _instancesMoved: Subject<InstanceMoveProps[]> = new Subject();
    public readonly _instancesDeleted: Subject<number[]> = new Subject();
    public readonly _instancesCreated: Subject<InstanceProps[]> = new Subject();
    public readonly _elementAdded: Subject<UpsertElementProps> = new Subject();
    public readonly _elementUpdated: Subject<UpsertElementProps> = new Subject(); // visibility change NOT included
    public readonly _elementChangedVisibility: Subject<{id: number, hide: boolean}> = new Subject();

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
        if (this._queuedCombinations === 0) return;
        await new Promise<void>((resolve) => {
            this._queueDoneCallback = () => resolve();
        });
    }

    private static async fetchWithCatch(uri: string): Promise<Response | undefined> {
        try {
            return await fetch(uri);
        } catch (err) {
            app.logger.log("error", "state", `Failed to send fetch request ${uri}`)
        }
        return undefined;
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

    public async createWorkspace(): Promise<boolean> {
        try {
            const newWs = await app.database.createWorkspace(this._activeSave!.id);
            this._workspaces.set(newWs.id, newWs);
            this._workspaceCreated.notify(newWs);
            return true;
        } catch {
            return false;
        }
    }

    // todo - debounce db
    public updateActiveWorkspace(changes: Partial<WorkspaceChangesProps>): void {
        if (changes.x !== undefined) this.activeWorkspace!.x = changes.x;
        if (changes.y !== undefined) this.activeWorkspace!.y = changes.y;
        if (changes.scale !== undefined) this.activeWorkspace!.scale = changes.scale;
        this._workspaceTransformed.notify(changes);
        app.database.updateWorkspace(this._activeWorkspace!.id, changes).catch();
    }

    public async duplicateWorkspace(id: number): Promise<boolean> {
        console.log("duplicateWorkspace");
        // todo -> load from db (export-like) + save to db (import-like) + move next to id
    }

    public async moveWorkspace(id: number, targetWsId: number): Promise<boolean> {
        try {
            const ws = this._workspaces.get(id);
            if ( !ws) return false;
            const targetWs = this._workspaces.get(targetWsId);
            if ( !targetWs) return false;
            const newPos = targetWs.position;

            await app.database.moveWorkspace(id, newPos);

            const minPos = Math.min(ws.position, newPos);
            const maxPos = Math.max(ws.position, newPos);
            const inc = newPos < ws.position ? 1 : -1;

            this._workspaces.forEach((props) => {
                if (props.id === ws.id) return;
                if (props.position >= minPos && props.position <= maxPos) props.position += inc;
            });
            const from = ws.position;
            ws.position = newPos;

            this._workspaceMoved.notify({ from: from, ws: ws, targetWs: targetWs });
            return true;
        } catch {
            return false;
        }
    }

    public renameWorkspace(id: number, newName: string): boolean {
        const ws = this._workspaces.get(id);
        if ( !ws) {
            app.logger.log("error", "state", `Error renaming workspace with id ${id} to ${newName}: Workspace not found`);
            return false;
        }

        ws.name = newName;
        app.database.updateWorkspace(id, {name: newName}).catch();
        return true;
    }

    public async deleteWorkspace(id: number): Promise<boolean> {
        try {
            const ws = this._workspaces.get(id);
            if ( !ws) return false;
            if (id === this._activeWorkspace!.id) {
                if (this._workspaces.size <= 1) return false;

                // find ws to load, so that we don't delete the active workspace
                let nextWs: WorkspaceProps = {id: -1, position: Infinity} as WorkspaceProps;
                let prevWs: WorkspaceProps = {id: -1, position: -Infinity} as WorkspaceProps;
                this._workspaces.forEach((props: WorkspaceProps) => {
                    if (props.position < ws.position && props.position > prevWs.position) prevWs = props;
                    if (props.position > ws.position && props.position < nextWs.position) nextWs = props;
                });
                const loadWs = nextWs.id === -1 ? prevWs : nextWs;
                await this.loadWorkspace(loadWs.id);
            }

            await app.database.deleteWorkspace(id);
            this._workspaces.delete(id);
            this._workspaces.forEach((props) => {
                if (props.position > ws.position) props.position--;
            });

            this._workspaceDeleted.notify(ws);
            return true;
        } catch {
            return false;
        }
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

    public updateElementVisibility(id: number, hide: boolean) {
        const e = this.elementsById[id];
        if (!!e.hide === hide) return;
        if (hide) {
            e.hide = true;
        } else {
            delete e.hide;
        }
        this._elementChangedVisibility.notify({id, hide});
        app.database.updateElementVisibility(this._activeSave!.id, id, hide).catch();
    }

    // assumes data is all valid and returned successfully + recipe is valid and sorted
    private async upsertElement(emoji: string, text: string, discovery: boolean, recipe: RecipeProps): Promise<[UpsertElementProps, boolean]> {
        let existing = this._elementsByText.get(text);
        const recipeCountBefore = existing?.recipes?.length ?? 0;

        // check that there is a change that needs to be persisted to db
        let id: number;
        let isNewRecipe = true;
        let isNewDiscovery = true;

        if (existing) {
            id = existing.id;
            const recipes = existing.recipes || [];
            isNewRecipe = recipes.every(r => r[0] !== recipe[0] || r[1] !== recipe[1]);
            isNewDiscovery = !existing.discovery && discovery;

            if ( !isNewRecipe && !isNewDiscovery) {
                // no change
                return [{
                    saveId: existing.saveId,
                    id: existing.id,
                    emoji: emoji,
                    text: text,
                }, false];
            }
        } else {
            const pendingId = this._newElementPendingUpsert.get(text);
            if (pendingId) {
                id = pendingId;
            } else {
                id = ++this._maxElementId;
                this._newElementPendingUpsert.set(text, id);
            }
        }

        // prepare props for db upsert
        const upsertProps: UpsertElementProps = {
            saveId: existing ? existing.saveId : this._activeSave!.id,
            id: id,
            emoji: emoji,
            text: text,
            recipe: recipe,
        }
        if (discovery) upsertProps.discovery = true;

        // db upsert - can throw an error (like unreachable db)
        await app.database.upsertElement(upsertProps);

        // update local state (important that this is done after db succeeds)

        // race condition prevention
        existing = this._elementsByText.get(text);
        const recipeCountAfter = existing?.recipes?.length ?? 0;

        let isNew = false;
        if (existing) {
            const recipes = existing.recipes || [];
            const stillIsNewRecipe = isNewRecipe &&
                ((recipeCountBefore === recipeCountAfter) || recipes.every(r => r[0] !== recipe[0] || r[1] !== recipe[1]));
            if (stillIsNewRecipe) {
                if ( !existing.recipes) existing.recipes = [];
                existing.recipes.push(recipe);
                this._activeSave!.recipeCount++;
            }

            const stillIsNewDiscovery = !existing.discovery && discovery;
            if (stillIsNewDiscovery) {
                existing.discovery = true;
                this._activeSave!.discoveryCount++;
            }

            this._elementUpdated.notify(upsertProps);

        } else {
            this._newElementPendingUpsert.delete(text);
            isNew = true;
            const newElement: ElementProps = {
                saveId: upsertProps.saveId,
                id: upsertProps.id,
                emoji: emoji,
                text: text,
                recipes: [recipe],
            }
            if (discovery) newElement.discovery = true;

            this._elementsById[newElement.id] = newElement;
            this._elementsByText.set(text, newElement);

            this._activeSave!.elementCount++;
            this._activeSave!.recipeCount++;
            if (discovery) this._activeSave!.discoveryCount++;

            this._elementAdded.notify(upsertProps);
        }

        return [upsertProps, isNew];
    }

    private replaceInstancesWithNew(id1: number, id2: number, instance: NewInstanceProps): InstanceProps {
        const toDelete: number[] = [];
        if (this.instances.delete(id1)) toDelete.push(id1);
        if (this.instances.delete(id2)) toDelete.push(id2);
        this._instancesDeleted.notify(toDelete);

        const newInstance: InstanceProps = instance as InstanceProps;
        newInstance.workspaceId = this._activeWorkspace!.id;
        newInstance.id = ++this._maxInstanceId;
        this._instances.set(newInstance.id, newInstance);
        this._instancesCreated.notify([newInstance]);

        app.database.applyInstanceChanges(this._activeWorkspace!.id, toDelete, [newInstance]).catch();

        return newInstance;
    }

    private static async checkRecipe(first: string, second: string, result: string): Promise<boolean> {
        let res = await StateService.fetchWithCatch(`${CHECK_RECIPE}?first=${encodeURIComponent(first)}&second=${encodeURIComponent(second)}&result=${encodeURIComponent(result)}`);
        if (res === undefined) return false;

        if ( !res.ok) {
            app.logger.log("error", "state", `Failed to verify if the following recipe is "valid":\n${first} + ${second} = ${result}`);
            return false;
        }

        const data: CheckRecipeResponse = await res.json();
        return data.valid;
    }

    // returns only after the combination's result was successfully saved to the db (or not if the fetch failed)
    // returns undefined when the combining fails (error or returned "non-real" Nothing), second returns whether the element was or wasn't new
    public async startCombiningElements(e1: { id: number, text: string }, e2: { id: number, text: string }): Promise<[UpsertElementProps, boolean] | undefined> {
        this._queuedCombinations++;
        let res = await StateService.fetchWithCatch(`${COMBINE_ELEMENTS}?first=${encodeURIComponent(e1.text)}&second=${encodeURIComponent(e2.text)}`);
        if (res === undefined) return undefined;

        if ( !res.ok) {
            app.logger.log("info", "state", `Elements '${e1.text}' and '${e2.text}' don't combine: HTTP error ${res.status}: ${res.statusText}`);
            return undefined;
        }

        const data: CombineElementsResponse = await res.json();
        if (data.result === "Nothing") {
            if ( !app.settings.settings.general.allowNothing) {
                app.logger.log("info", "state", `Tried to combine ${e1.text} + ${e2.text}, but they result in Nothing and it is blocked in Settings`);
                return undefined;
            }

            const valid = await StateService.checkRecipe(e1.text, e2.text, "Nothing");
            if (!valid) {
                app.logger.log("info", "state", `Tried to combine ${e1.text} + ${e2.text}, but they don't combine`);
                return undefined;
            }
        }

        app.logger.logRaw("recipe", `${e1.text < e2.text ? `${e1.text} + ${e2.text}` : `${e2.text} + ${e1.text}`} = ${data.result}`);
        const recipe = e1.text < e2.text ? [e1.id, e2.id] : [e2.id, e1.id];
        const [upsertProps, isNew] = await this.upsertElement(data.emoji, data.result, data.isNew, recipe);
        app.logger.log("info", "state", `Successfully combined elements ${e1.text} + ${e2.text} = ${data.result}`);
        return [upsertProps, isNew];
    }

    public finishCombiningElements(id1: number, id2: number, instance: NewInstanceProps | undefined): void {
        if (instance) {
            this.replaceInstancesWithNew(id1, id2, instance);
        }

        this._queuedCombinations--;
        if (this._queuedCombinations === 0) {
            this._queueDoneCallback();
            this._queueDoneCallback = () => {};
        }
    }
}
