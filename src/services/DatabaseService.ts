import {app} from "../main";
import {
    DATABASE_NAME,
    DATABASE_VERSION,
    ELEMENT_STORE, INSTANCE_STORE, SAVE_ID_INDEX,
    SAVE_STORE, SETTINGS_KEY,
    SETTINGS_STORE, WORKSPACE_ID_INDEX,
    WORKSPACE_STORE
} from "../constants/dbSchema";
import type {
    Element,
    IDBTransactionEvent,
    Instance,
    Save,
    Settings,
    Workspace,
    WorkspaceChanges
} from "../types/dbSchema";
import {
    DEFAULT_ELEMENTS, DEFAULT_SAVE,
    DEFAULT_SAVE_NAME,
    DEFAULT_SETTINGS, DEFAULT_WORKSPACE,
    DEFAULT_WORKSPACE_NAME
} from "../constants/defaults";
import type {AbortReason} from "../types/dbSchema";

// todo - either disable multiple tabs (detect with broadcast channel)
//      - or make a system to lock a certain save, then any other tab may not modify or access that save


// workspace and instance updates / creation / deletion -> does not update the save's datetimeUpdated info (so that it isn't
// updated that much.. like really, I don't think it is necessary, if it is needed in the future, you can just easily
// add a request to get the save, update timestamp, and put it updated again to the transaction (probably could be made into a separate method))
export class DatabaseService {
    private _db: IDBDatabase;

    // connect to the db, create if needed (upgrading from previous versions not implemented / needed atm)
    public async connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onerror = () => this.onOpenError(request, reject);
            request.onupgradeneeded = () => this.onUpgradeNeeded(request);
            request.onsuccess = () => this.onOpenSuccess(request, resolve);
        });
    }

    private async onOpenError(request: IDBOpenDBRequest, reject) {
        app.logger.log("error", "db", `Error occurred when accessing IndexedDB: ${request.error?.message}`);
        reject();
    }

    private async onUpgradeNeeded(request: IDBOpenDBRequest) {
        this._db = request.result;

        this._db.createObjectStore(SETTINGS_STORE, { keyPath: "id", autoIncrement: false });

        this._db.createObjectStore(SAVE_STORE, { keyPath: "id", autoIncrement: true });

        const elementStore = this._db.createObjectStore(ELEMENT_STORE, { keyPath: "id", autoIncrement: true });
        elementStore.createIndex(SAVE_ID_INDEX, "saveId", { unique: false });

        const workspaceStore = this._db.createObjectStore(WORKSPACE_STORE, { keyPath: "id", autoIncrement: true });
        workspaceStore.createIndex(SAVE_ID_INDEX, "saveId", { unique: false });

        const instanceStore = this._db.createObjectStore(INSTANCE_STORE, { keyPath: "id", autoIncrement: true });
        instanceStore.createIndex(WORKSPACE_ID_INDEX, "workspaceId", { unique: false });

        app.logger.log("info", "db", "IndexedDB upgrade completed successfully");
    }

    private async onOpenSuccess(request: IDBOpenDBRequest, resolve) {
        this._db = request.result;

        this._db.onabort = this.handleAbort;

        app.logger.log("info", "db", "IndexedDB opened successfully");
        resolve();
    }

    public async loadSettings(): Promise<Settings> {
        return new Promise<Settings>((resolve, reject) => {
            const req = this._db
                .transaction([SETTINGS_STORE], "readonly")
                .objectStore(SETTINGS_STORE)
                .get(SETTINGS_KEY);

            req.onerror = (event) => {
                app.logger.log("error", "db", `Error reading settings: ${req.error?.message}`);
                event.stopPropagation();
                reject();
            }

            req.onsuccess = () => {
                const settings = {
                    ...DEFAULT_SETTINGS,
                    ...req.result,
                };

                app.logger.log("info", "db", "Settings loaded successfully");
                resolve(settings);
            }
        });
    }

    public async updateSettings(settings: Settings): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const req = this._db
                .transaction(SETTINGS_STORE, "readwrite")
                .objectStore(SETTINGS_STORE)
                .put(settings);

            req.onerror = (event) => {
                app.logger.log("error", "db", `Error saving settings: ${req.error?.message}`);
                event.stopPropagation();
                reject();
            }

            req.onsuccess = () => {
                app.logger.log("info", "db", "Settings saved successfully");
                resolve();
            }
        });
    }

    // loads all saves' info from db, and if no save is present, then it creates a default save
    // (new one is created to ensure that when a user loads the page, there is always a save that the user's progress gets saved to)
    public async loadSaveInfo(): Promise<Map<number, Save>> {
        let savesArr: Save[];

        await new Promise<boolean>((resolve, reject) => {
            const req = this._db
                .transaction(SAVE_STORE, "readonly")
                .objectStore(SAVE_STORE)
                .getAll();

            req.onerror = () => {
                app.logger.log("error", "db", `Failed to load save info: ${req.error?.message}`);
                reject();
            }

            req.onsuccess = () => {
                savesArr = req.result;
                resolve();
            }
        });

        const saves: Map<number, Save> = new Map(savesArr.map(save => [save.id, save]));

        if (saves.size === 0) {
            const newSave = await this.createNewSave();
            if (newSave) {
                saves.set(newSave.id, newSave);
            }
        }

        app.logger.log("info", "db", "Save info loaded successfully");
        return saves;
    }

    public async createNewSave(name: string = DEFAULT_SAVE_NAME): Promise<Save> {
        return new Promise<Save>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);

            const save: Partial<Save> = {
                ...DEFAULT_SAVE,
                name: name,
                datetimeCreated: new Date().getTime(),
            };
            const saveReq = saveStore.add(save);

            saveReq.onsuccess = () => {
                save.id = <number>saveReq.result;
                const elementStore = tx.objectStore(ELEMENT_STORE);
                DEFAULT_ELEMENTS.forEach((element) => {
                    elementStore.add({
                        ...element,
                        saveId: save.id,
                    });
                });
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                app.logger.log("error", "db", `Failed to create new save: ${event.target.error?.message}`);
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", "New save created successfully");
                resolve(save);
            }
        });
    }

    public async renameSave(saveId: number, newName: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const tx = this._db.transaction(SAVE_STORE, "readwrite");
            const store = tx.objectStore(SAVE_STORE);

            const getReq = store.get(saveId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const save = getReq.result;
                if ( !save) {
                    abortReason = `Failed to rename save with id ${saveId}: Save not found`;
                    tx.abort();
                    return;
                }

                const newSave = {
                    ...save,
                    name: newName,
                    datetimeUpdated: new Date().getTime(),
                }
                store.put(newSave);
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", `Failed to rename save with id ${saveId} to '${newName}': ${event.target.error?.message}`);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Save with id ${saveId} renamed to '${newName}' successfully`);
                resolve();
            }
        });
    }

    public async deleteSave(saveId: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE, WORKSPACE_STORE, INSTANCE_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const elementStore = tx.objectStore(ELEMENT_STORE);
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);
            const instanceStore = tx.objectStore(INSTANCE_STORE);

            const wsIndex = workspaceStore.index(SAVE_ID_INDEX);
            const getWsReq = wsIndex.getAll(IDBKeyRange.only(saveId));

            getWsReq.onsuccess = () => {
                const workspaces = getWsReq.result;

                // delete all instances
                for (const ws of workspaces) {
                    this.deleteAllByIndex(instanceStore, WORKSPACE_ID_INDEX, ws.id);
                }

                // delete all workspaces
                this.deleteAllByIndex(workspaceStore, SAVE_ID_INDEX, saveId);

                // delete all elements
                this.deleteAllByIndex(elementStore, SAVE_ID_INDEX, saveId);

                // delete the save
                saveStore.delete(saveId);
            }

            tx.onabort = (event) => {
                app.logger.log("error", "db", `Failed to delete save with id ${saveId}: ${tx.error?.message}`);
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db",`Successfully deleted save with id ${saveId}`);
                resolve();
            }
        });
    }

    public async createWorkspace(saveId: number, name: string = DEFAULT_WORKSPACE_NAME): Promise<Workspace> {
        return new Promise<Workspace>(async (resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, WORKSPACE_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);

            const getReq = saveStore.getKey(saveId);

            let workspace: Partial<Workspace>;
            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                if ( !getReq.result) {
                    abortReason = `Failed to create workspace in save with id ${saveId}: Save not found`;
                    tx.abort();
                    return;
                }

                workspace = {
                    ...DEFAULT_WORKSPACE,
                    saveId: saveId,
                    name: name,
                }
                const countReq = workspaceStore
                    .index(SAVE_ID_INDEX)
                    .count(IDBKeyRange.only(saveId));

                countReq.onsuccess = () => {
                    const count = countReq.result;
                    workspace.position = count + 1;
                    const wsReq = workspaceStore.add(workspace);
                    wsReq.onsuccess = () => {
                        workspace.id = <number>wsReq.result;
                    }
                }
            }

            tx.onabort = (event) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", `Failed to create new workspace: ${tx.error?.message}`);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", "New workspace created successfully");
                resolve(workspace);
            }
        });
    }

    public async updateWorkspace(workspaceId: number, changes: Partial<WorkspaceChanges>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction(WORKSPACE_STORE, "readwrite");
            const store = tx.objectStore(WORKSPACE_STORE);

            const getReq = store.get(workspaceId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const workspace = getReq.result;
                if ( !workspace) {
                    abortReason = `Error updating workspace with id ${workspaceId}: Workspace not found`;
                    tx.abort();
                    return;
                }

                const newWorkspace = {
                    ...workspace,
                    ...changes,
                }
                store.put(newWorkspace);
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", `Error updating workspace with id ${workspaceId}: ${event.target.error?.message}`);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Workspace with id ${workspaceId} updated successfully`);
                resolve();
            }
        });
    }

    public async moveWorkspace(workspaceId: number, newPosition: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (newPosition < 1) {
                app.logger.log("error", "db", `Error moving workspace with id ${workspaceId} to position ${newPosition}: Position isn't natural`);
                return reject();
            }
            const tx = this._db.transaction(WORKSPACE_STORE, "readwrite");
            const store = tx.objectStore(WORKSPACE_STORE);

            const getReq = store.get(workspaceId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const targetWorkspace = getReq.result;
                if ( !targetWorkspace) {
                    abortReason = `Error moving workspace with id ${workspaceId} to position ${newPosition}: Workspace not found`;
                    tx.abort();
                    return;
                }

                const saveId = targetWorkspace.saveId;
                const minPos = Math.min(targetWorkspace.position, newPosition);
                const maxPos = Math.max(targetWorkspace.position, newPosition);
                if (minPos === maxPos) return;

                let workspaceCount = 0;
                const inc = newPosition < targetWorkspace.position ? 1 : -1;

                const cursorReq = store
                    .index(SAVE_ID_INDEX)
                    .openCursor(saveId);

                cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if ( !cursor) {
                        if (newPosition > workspaceCount) {
                            abortReason = `Error moving workspace with id ${workspaceId} to position ${newPosition}: Position larger than the total amount of workspaces`;
                            tx.abort();
                        }
                        return;
                    }

                    const workspace = cursor.value;
                    workspaceCount++;
                    if (workspace.id === workspaceId) {
                        workspace.position = newPosition;
                        cursor.update(workspace);
                    } else if (workspace.position >= minPos && workspace.position <= maxPos) {
                        workspace.position += inc;
                        cursor.update(workspace);
                    }
                    cursor.continue();
                }
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", event.target.error?.message);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db",`Workspace with id ${workspaceId} moved to position ${newPosition} successfully`);
                resolve();
            }
        });
    }

    public async deleteWorkspace(workspaceId: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction(WORKSPACE_STORE, "readwrite");
            const store = tx.objectStore(WORKSPACE_STORE);

            const getReq = store.get(workspaceId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const targetWorkspace = getReq.result;
                if ( !targetWorkspace) {
                    abortReason = `Error deleting workspace with id ${workspaceId}: Workspace not found`;
                    tx.abort();
                    return;
                }

                const saveId = targetWorkspace.saveId;
                const thresholdPos = targetWorkspace.position;
                const cursorReq = store
                    .index(SAVE_ID_INDEX)
                    .openCursor(saveId);

                cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if ( !cursor) return;

                    const workspace = cursor.value;
                    if (workspace.id === workspaceId) {
                        cursor.delete();
                    } else if (workspace.position > thresholdPos) {
                        workspace.position -= 1;
                        cursor.update(workspace);
                    }
                    cursor.continue();
                }
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", event.target.error?.message);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db",`Workspace with id ${workspaceId} deleted successfully`);
                resolve();
            }
        });
    }

    public async updateElement(): Promise<void> {} // hide x show
    // adds element + its recipe -> call smth like addElement().then(... combineInstances)
    public async addElement(): Promise<Element> {}
    // add recipe to an already existing element
    public async addRecipe(): Promise<void> {}
    // remove two instances, add one instance
    public async combineInstances(): Promise<Instance> {}
    // add one instance
    public async createInstance(): Promise<Instance> {}
    // add multiple instances
    public async createInstances(): Promise<Instance[]> {}
    public async moveInstance(): Promise<void> {}
    public async moveInstances(): Promise<void> {}
    public async deleteInstance(): Promise<void> {}
    public async deleteInstances(): Promise<void> {}

    // todo - and other functions, that load and export whole savefiles (or workspaces in the future?)


    // loads the most recently modified / created save and its one workspace (if it has one)
    // todo - figure out exact return values / types
    public async load(): Promise<void> {

    }

    private deleteAllByIndex(store: IDBObjectStore, indexName: string, key: IDBValidKey) {
        const cursorReq = store
            .index(indexName)
            .openCursor(IDBKeyRange.only(key));
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                const deleteReq = cursor.delete();
                deleteReq.onsuccess = () => {
                    cursor.continue();
                }
            }
        }
    }

    // to log all unhandled aborted transactions
    private handleAbort = (event) => {
        app.logger.log("error", "db", `IndexedDB error: Transaction aborted: ${event.target.error?.message}`);
    }

    public async testPropagation(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            this._db.onerror = (event) => {
                console.log("db.onerror: ", (<{error: {message: any}}>event.target).error?.message);
            }
            this._db.onabort = (event) => {
                console.log("db.onabort: ", (<{error: {message: any}}>event.target).error?.message);
            }

            const tx = this._db.transaction(SETTINGS_STORE, "readwrite");
            const store = tx.objectStore(SETTINGS_STORE);

            store.add({id: 1});

            const keyReq = store.add({id: 1});
            keyReq.onerror = (event) => {
                console.log("keyReq.onerror", keyReq.result, keyReq.error?.message);
            }
            keyReq.onsuccess = (event) => {
                console.log("keyReq.onsuccess", keyReq.result, keyReq.error?.message);
            }

            const keyReq2 = store.add({id: 2});
            keyReq2.onerror = (event) => {
                console.log("keyReq2.onerror", keyReq2.result, keyReq2.error?.message);
            }
            keyReq2.onsuccess = (event) => {
                console.log("keyReq2.onsuccess", keyReq2.result, keyReq2.error?.message);
            }

            tx.onerror = (event: IDBTransactionEvent) => {
                console.log("tx.onerror 2", tx.error?.message, event.target.error?.message);
            }
            tx.onabort = (event: IDBTransactionEvent) => {
                console.log("tx.onabort", tx.error?.message, event.target.error?.message);
            }
            tx.oncomplete = (event: IDBTransactionEvent) => {
                console.log("tx.oncomplete", tx.error?.message, event.target.error?.message);
            }
        });
    }
}
