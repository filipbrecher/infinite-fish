import {app} from "../main";
import {
    DATABASE_NAME,
    DATABASE_VERSION,
    ELEMENT_STORE, INSTANCE_STORE, MIN_WORKSPACE_POS, SAVE_ID_INDEX,
    SAVE_STORE, SETTINGS_KEY,
    SETTINGS_STORE, WORKSPACE_ID_INDEX,
    WORKSPACE_STORE
} from "../constants/dbSchema";
import type {Element, Instance, Save, Settings, Workspace} from "../types/dbSchema";
import {
    DEFAULT_ELEMENTS, DEFAULT_SAVE,
    DEFAULT_SAVE_NAME,
    DEFAULT_SETTINGS, DEFAULT_WORKSPACE,
    DEFAULT_WORKSPACE_NAME
} from "../constants/defaults";

// todo - either disable multiple tabs (detect with broadcast channel)
//      - or make a system to lock a certain save, then any other tab may not modify or access that save
// todo - write to db always in one transaction (like write new element, add new instance, delete old instances, update save metadata)

export class DatabaseService {
    private _db: IDBDatabase;

    // connect to the db, create if needed (upgrading from previous versions not implemented / needed atm)
    public async connect(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onerror = () => this.onOpenError(request, resolve);
            request.onupgradeneeded = () => this.onUpgradeNeeded(request);
            request.onsuccess = () => this.onOpenSuccess(request, resolve);
        });
    }

    private async onOpenError(request: IDBOpenDBRequest, resolve) {
        app.logger.log("error", "db", `Error occurred when accessing IndexedDB: ${request.error?.message}`);
        resolve(false);
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

        this._db.onerror = this.handleError;
        this._db.onabort = this.handleAbort;

        app.logger.log("info", "db", "IndexedDB opened successfully");
        resolve(true);
    }

    public async loadSettings(): Promise<Settings | undefined> {
        return new Promise<Settings>((resolve) => {
            const req = this._db
                .transaction([SETTINGS_STORE], "readonly")
                .objectStore(SETTINGS_STORE)
                .get(SETTINGS_KEY);

            req.onerror = () => {
                app.logger.log("error", "db", `Error reading settings: ${req.error?.message}`);
                resolve();
            }

            req.onsuccess = () => {
                const settings = DEFAULT_SETTINGS;
                const loaded: Settings = req.result;
                for (const property in loaded) {
                    settings[property] = loaded[property];
                }

                app.logger.log("info", "db", "Settings loaded successfully")
                resolve(settings);
            }
        });
    }

    public async updateSettings(settings: Settings): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const req = this._db
                .transaction(SETTINGS_STORE, "readwrite")
                .objectStore(SETTINGS_STORE)
                .put(settings);

            req.onerror = () => {
                app.logger.log("error", "db", `Error saving settings: ${req.error?.message}`);
                resolve(false);
            }

            req.onsuccess = () => {
                app.logger.log("info", "db", "Settings saved successfully");
                resolve(true);
            }
        });
    }

    // loads all saves' info from db, and if no save is present, then it creates a default save
    // (new one is created to ensure that when a user loads the page, there is always a save that the user's progress gets saved to)
    public async loadSaveInfo(): Promise<Map<number, Save> | undefined> {
        let req: IDBRequest;

        const success = await new Promise<boolean>((resolve) => {
            req = this._db
                .transaction(SAVE_STORE, "readonly")
                .objectStore(SAVE_STORE)
                .getAll();

            req.onerror = () => resolve(false);
            req.onsuccess = () => resolve(true);
        });

        if ( !success) {
            app.logger.log("error", "db", `Failed to load save info: ${req.error?.message}`);
            return;
        }

        const savesArr: Save[] = req.result;
        const saves: Map<number, Save> = new Map(savesArr.map(save => [save.id, save]));

        if (saves.size === 0) {
            const newSave = await this.createNewSave();
            if ( !newSave) {
                app.logger.log("error", "db", "Failed to create a default save (no saves in DB on page load)")
                return;
            }
            saves.set(newSave.id, newSave);
        }

        app.logger.log("info", "db", "Save info loaded successfully");
        return saves;
    }

    public async createNewSave(name: string = DEFAULT_SAVE_NAME): Promise<Save | undefined> {
        return new Promise<Save | undefined>((resolve) => {
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

            tx.onabort = (event) => {
                app.logger.log("error", "db", `Failed to create new save: ${tx.error?.message}`);
                resolve();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", "New save created successfully");
                resolve(save);
            }
        });
    }

    public async renameSave(saveId: number, newName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            const tx = this._db.transaction(SAVE_STORE, "readwrite");
            const store = tx.objectStore(SAVE_STORE);

            const save = await this.getSaveByIndex(store, saveId);
            if ( !save) {
                app.logger.log("error", "db", `Failed to rename save with id ${saveId}: save not found`);
                return resolve(false);
            }

            const newSave = {
                ...save,
                name: newName,
                datetimeUpdated: new Date().getTime(),
            }

            const req = this._db
                .transaction(SAVE_STORE, "readwrite")
                .objectStore(SAVE_STORE)
                .put(newSave);

            req.onerror = () => {
                app.logger.log("error", "db", `Failed to rename save with id ${saveId} to '${newSave.name}': ${req.error?.message}`);
                resolve(false);
            }

            req.onsuccess = () => {
                app.logger.log("info", "db", `Save with id ${saveId} renamed to '${newSave.name}' successfully`);
                resolve(true);
            }
        });
    }

    public async deleteSave(saveId: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
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

            tx.onerror = (event) => {
                event.stopPropagation();
            }
            tx.onabort = (event) => {
                app.logger.log("error", "db", `Failed to delete save with id ${saveId}: ${tx.error?.message}`);
                event.stopPropagation();
                resolve(false);
            }
            tx.oncomplete = () => {
                app.logger.log("info", "db",`Successfully delete save with id ${saveId}`);
                resolve(true);
            }
        });
    }

    public async createWorkspace(saveId: number, name: string = DEFAULT_WORKSPACE_NAME): Promise<Workspace | undefined> {
        return new Promise<Workspace | undefined>(async (resolve) => {
            const tx = this._db.transaction([SAVE_STORE, WORKSPACE_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);

            if ( !await this.doesSaveExist(saveStore, saveId)) {
                app.logger.log("error", "db", `Failed to create workspace in save with id ${saveId}: Save not found`);
            }

            const workspace: Partial<Workspace> = {
                ...DEFAULT_WORKSPACE,
                saveId: saveId,
                name: name,
            }
            const cursorReq = workspaceStore
                .index(SAVE_ID_INDEX)
                .openCursor(IDBKeyRange.only(saveId));

            cursorReq.onsuccess = () => {
                let maxPos = MIN_WORKSPACE_POS - 1;
                const cursor = cursorReq.result;
                if (cursor) {
                    const req = cursor.value;
                    req.onsuccess = () => {
                        maxPos = Math.max(maxPos, req.result);
                        cursor.continue();
                    }
                }

                workspace.position = maxPos + 1;

                const wsReq = workspaceStore.add(workspace);
                wsReq.onsuccess = () => {
                    workspace.id = <number>wsReq.result;
                }
            }

            tx.onabort = () => {
                app.logger.log("error", "db", `Failed to create new workspace: ${tx.error?.message}`);
                resolve();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", "New workspace created successfully");
                resolve(workspace);
            }
        });
    }

    public async updateWorkspace(): Promise<boolean> {} // like update name / x / y / scale
    public async moveWorkspace(workspaceId: number, newPosition: number): Promise<boolean> {}
    public async deleteWorkspace(): Promise<boolean> {}
    public async updateElement(): Promise<boolean> {} // hide x show
    public async createElement(): Promise<Element | undefined> {} // create new element, and also remove old instances, add the new instance to workspace
    public async createInstance(): Promise<Instance> {}
    public async createInstances(): Promise<Instance[] | undefined> {}
    public async moveInstance(): Promise<boolean> {}
    public async moveInstances(): Promise<boolean> {}
    public async deleteInstance(): Promise<boolean> {}
    public async deleteInstances(): Promise<boolean> {}

    // todo - and other functions, that load and export whole savefiles (or workspaces in the future?)


    // loads the most recently modified / created save and its one workspace (if it has one)
    // todo - figure out exact return values / types
    public async load(): Promise<boolean> {

    }

    private async doesSaveExist(store: IDBObjectStore, saveId: number): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const req = store.getKey(saveId);
            req.onerror = () => {
                resolve(false);
            }
            req.onsuccess = () => {
                resolve(<any>req.result !== undefined);
            }
        });
    }

    private async getSaveByIndex(store: IDBObjectStore, saveId: number): Promise<Save | undefined> {
        return new Promise<Save | undefined>((resolve) => {
            const req = store.get(saveId);
            req.onerror = () => {
                resolve();
            }
            req.onsuccess = () => {
                resolve(req.result);
            }
        });
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

    private handleError = (event) => {
        app.logger.log("error", "db", `IndexedDB error: ${event.target.error?.message}`);
    }

    private handleAbort = (event) => {
        app.logger.log("error", "db", `IndexedDB error: Transaction aborted: ${event.target.error?.message}`);
    }
}
