import {app} from "../main";
import {
    DATABASE_NAME,
    DATABASE_VERSION,
    ELEMENT_STORE, FOLDER_ID_INDEX, FOLDER_ITEM_STORE, FOLDER_STORE,
    INSTANCE_STORE,
    SAVE_ID_INDEX,
    SAVE_STORE,
    SETTINGS_KEY,
    SETTINGS_STORE,
    WORKSPACE_ID_INDEX,
    WORKSPACE_STORE
} from "../constants/dbSchema";
import type {
    AbortReason,
    ElementProps,
    IDBTransactionEvent,
    InstanceProps,
    SaveProps,
    SettingsProps,
    WorkspaceProps
} from "../types/db/schema";
import {ViewTypeProps} from "../types/db/schema";
import type {InstanceMoveProps, UpsertElementProps, WorkspaceChangesProps} from "../types/db/dto";
import {
    DEFAULT_ELEMENTS,
    DEFAULT_SAVE,
    DEFAULT_SAVE_NAME,
    DEFAULT_WORKSPACE,
    DEFAULT_WORKSPACE_NAME
} from "../constants/defaults";

// todo - either disable multiple tabs (detect with broadcast channel)
//      - or make a system to lock a certain save, then any other tab may not modify or access that save
// todo - pinned elements / or just folder system altogether (basically like workspaces, but with unique ordered items)

export class DatabaseService {
    private _db: IDBDatabase;

    // connect to the db, create if needed (upgrading from previous versions not implemented / needed atm)
    public async connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onerror = () => this.onOpenError(request, reject);
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => this.onUpgradeNeeded(request, event);
            request.onsuccess = () => this.onOpenSuccess(request, resolve);
        });
    }

    private async onOpenError(request: IDBOpenDBRequest, reject) {
        app.logger.log("error", "db", `Error occurred when accessing IndexedDB: ${request.error?.message}`);
        reject();
    }

    private async onUpgradeNeeded(request: IDBOpenDBRequest, event: IDBVersionChangeEvent) {
        this._db = request.result;

        switch (event.oldVersion) {
            case 0:
                app.logger.log("info", "db", "Upgrading IndexedDB from version 0 to version 1");

                this._db.createObjectStore(SETTINGS_STORE, { keyPath: "id", autoIncrement: false });

                this._db.createObjectStore(SAVE_STORE, { keyPath: "id", autoIncrement: true });

                const elementStore = this._db.createObjectStore(ELEMENT_STORE, { keyPath: ["saveId", "id"], autoIncrement: false });
                elementStore.createIndex(SAVE_ID_INDEX, "saveId", { unique: false });

                const workspaceStore = this._db.createObjectStore(WORKSPACE_STORE, { keyPath: "id", autoIncrement: true });
                workspaceStore.createIndex(SAVE_ID_INDEX, "saveId", { unique: false });

                const instanceStore = this._db.createObjectStore(INSTANCE_STORE, { keyPath: ["workspaceId", "id"], autoIncrement: false });
                instanceStore.createIndex(WORKSPACE_ID_INDEX, "workspaceId", { unique: false });

            case 1:
                app.logger.log("info", "db", "Upgrading IndexedDB from version 1 to version 2");

                const folderStore = this._db.createObjectStore(FOLDER_STORE, { keyPath: "id", autoIncrement: true });
                folderStore.createIndex(SAVE_ID_INDEX, "saveId", { unique: false });

                const folderItemStore = this._db.createObjectStore(FOLDER_ITEM_STORE, { keyPath: ["folderId", "id"], autoIncrement: false });
                folderItemStore.createIndex(FOLDER_ID_INDEX, "folderId", { unique: false });
        }

        app.logger.log("info", "db", "IndexedDB upgrade completed successfully");
    }

    private async onOpenSuccess(request: IDBOpenDBRequest, resolve) {
        this._db = request.result;

        this._db.onabort = this.handleAbort;

        app.logger.log("info", "db", "IndexedDB opened successfully");
        resolve();
    }

    public async loadSettings(): Promise<Partial<SettingsProps> & { id: number }> {
        return new Promise<SettingsProps>((resolve, reject) => {
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
                app.logger.log("info", "db", "Settings loaded successfully");
                resolve(req.result);
            }
        });
    }

    public async updateSettings(settings: SettingsProps): Promise<void> {
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

    public async loadSaveInfo(): Promise<SaveProps[]> {
        let saves: SaveProps[];

        await new Promise<void>((resolve, reject) => {
            const req = this._db
                .transaction(SAVE_STORE, "readonly")
                .objectStore(SAVE_STORE)
                .getAll();

            req.onerror = () => {
                app.logger.log("error", "db", `Failed to load save info: ${req.error?.message}`);
                reject();
            }

            req.onsuccess = () => {
                saves = req.result;
                resolve();
            }
        });

        app.logger.log("info", "db", "Save info loaded successfully");
        return saves;
    }

    public async createNewSave(name: string = DEFAULT_SAVE_NAME): Promise<SaveProps> {
        return new Promise<SaveProps>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE, WORKSPACE_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const elementStore = tx.objectStore(ELEMENT_STORE);
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);

            const now = Date.now();
            const save: Partial<SaveProps> = {
                ...DEFAULT_SAVE,
                name: name,
                datetimeCreated: now,
                datetimeActive: now,
            };
            const saveReq = saveStore.add(save);

            saveReq.onsuccess = () => {
                save.id = saveReq.result as number;

                DEFAULT_ELEMENTS.forEach((element, id) => {
                    elementStore.add({
                        ...element,
                        id: id,
                        saveId: save.id,
                    });
                });

                const workspace = {
                    ...DEFAULT_WORKSPACE,
                    saveId: save.id,
                    name: DEFAULT_WORKSPACE_NAME,
                    position: 1,
                }
                const wsReq = workspaceStore.add(workspace);
                wsReq.onsuccess = () => {
                    save.lastActiveWorkspaceId = wsReq.result as number;
                    saveStore.put(save);
                }
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                app.logger.log("error", "db", `Failed to create new save: ${event.target.error?.message}`);
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", "New save created successfully");
                resolve(save as SaveProps);
            }
        });
    }

    public async updateActiveTimeOfSave(saveId: number, datetime: number): Promise<void> {
        return this.updateSave(
            saveId,
            (save: SaveProps) => {
                save.datetimeActive = datetime;
            },
            (pastTense: boolean) => {
                return `${pastTense ? "updated" : "updating"} lastActiveAt of save with id ${saveId}`;
            }
        );
    }

    public async updateLastActiveWsOfSave(saveId: number, workspaceId: number): Promise<void> {
        return this.updateSave(
            saveId,
            (save: SaveProps) => {
                save.lastActiveWorkspaceId = workspaceId;
            },
            (pastTense: boolean) => {
                return `${pastTense ? "updated" : "updating"} lastActiveWorkspaceId of save with id ${saveId} to ${workspaceId}`;
            }
        );
    }

    public async renameSave(saveId: number, newName: string): Promise<void> {
        return this.updateSave(
            saveId,
            (save: SaveProps) => {
                save.name = newName;
            },
            (pastTense: boolean) => {
                return `${pastTense ? "renamed" : "renaming"} save with id ${saveId} to '${newName}'`;
            }
        );
    }

    private async updateSave(
        saveId: number,
        updateSave: (save: SaveProps) => void,
        getLogEnding: (pastTense: boolean) => string,
    ): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const tx = this._db.transaction(SAVE_STORE, "readwrite");
            const store = tx.objectStore(SAVE_STORE);
            const getReq = store.get(saveId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const save = getReq.result;
                if ( !save) {
                    abortReason = `Error ${getLogEnding(false)}: Save not found`;
                    tx.abort();
                    return;
                }

                updateSave(save);
                store.put(save);
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", `Error ${getLogEnding(false)}: ${event.target.error?.message}`);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Successfully ${getLogEnding(true)}`);
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

    public async createWorkspace(saveId: number, name: string = DEFAULT_WORKSPACE_NAME): Promise<WorkspaceProps> {
        return new Promise<WorkspaceProps>(async (resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, WORKSPACE_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);

            const getReq = saveStore.getKey(saveId);

            let workspace: Partial<WorkspaceProps>;
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
                        workspace.id = wsReq.result as number;
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
                resolve(workspace as WorkspaceProps);
            }
        });
    }

    public async updateWorkspace(workspaceId: number, changes: Partial<WorkspaceChangesProps>): Promise<void> {
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
            const tx = this._db.transaction([WORKSPACE_STORE, INSTANCE_STORE], "readwrite");
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);
            const instanceStore = tx.objectStore(INSTANCE_STORE);

            const getReq = workspaceStore.get(workspaceId);

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
                const cursorReq = workspaceStore
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

                this.deleteAllByIndex(instanceStore, WORKSPACE_ID_INDEX, workspaceId);
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

    // create a new element if it doesn't exist, otherwise updates recipes and/or discovery
    // DOES NOT check whether the element with this text exists or doesn't exist (just the id, saveId combo)
    // DOES NOT check that the ids of the elements in the recipe are valid within that save
    // DOES NOT check whether the elements in the recipe are sorted correctly by text
    public async upsertElement(props: UpsertElementProps): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const elementStore = tx.objectStore(ELEMENT_STORE);
            const getSaveReq = saveStore.get(props.saveId);

            let abortReason: AbortReason;
            getSaveReq.onsuccess = () => {
                const save: SaveProps = getSaveReq.result;
                if ( !save) {
                    abortReason = `Error adding element/recipe ${JSON.stringify(props)}: Save not found`;
                    tx.abort();
                    return;
                }

                const getElReq = elementStore.get([props.saveId, props.id]);
                getElReq.onsuccess = () => {
                    let element: ElementProps = getElReq.result;

                    let newElement = false;
                    let newDiscovery = false;
                    let newRecipe = false;

                    if (element) { // add recipe
                        if (props.recipe) {
                            if (element.recipes?.some(r => r[0] === props.recipe![0] && r[1] === props.recipe![1])) {
                                // newRecipe = false;
                            } else if (element.recipes) {
                                element.recipes.push(props.recipe);
                                newRecipe = true;
                            } else {
                                element.recipes = [props.recipe];
                                newRecipe = true;
                            }
                        }
                    } else {
                        newElement = true;
                        element = {
                            saveId: props.saveId,
                            id: props.id,
                            emoji: props.emoji,
                            text: props.text,
                        }
                        if (props.recipe) {
                            element.recipes = [props.recipe]
                            newRecipe = true
                        }
                    }
                    if (props.discovery && !element.discovery) {
                        element.discovery = true;
                        newDiscovery = true;
                    }
                    elementStore.put(element);

                    if (newElement) save.elementCount++;
                    if (newDiscovery) save.discoveryCount++;
                    if (newRecipe) save.recipeCount++;
                    if (newElement || newDiscovery || newRecipe) {
                        saveStore.put(save);
                    }
                }
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db",
                        `Error adding element/recipe ${JSON.stringify(props)}: ${event.target.error?.message}`
                    );
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Element/recipe ${JSON.stringify(props)} successfully added to save`);
                resolve();
            }
        });
    }

    public async updateElementVisibility(saveId: number, elementId: number, hide: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction(ELEMENT_STORE, "readwrite");
            const elementStore = tx.objectStore(ELEMENT_STORE);

            const getReq = elementStore.get([saveId, elementId]);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const element = getReq.result;
                if ( !element) {
                    abortReason = `Error updating visibility of element with id ${elementId} in save with id ${saveId}: Element not found`;
                    tx.abort();
                    return;
                }

                element.hide = hide;
                if ( !hide) {
                    delete element.hide;
                }
                elementStore.put(element);
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db", `Error updating visibility of element with id ${elementId} in save with id ${saveId}: ${event.target.error?.message}`);
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Successfully updated visibility of element with id ${elementId} in save with id ${saveId}`);
                resolve();
            }
        });
    }

    // delete and/or create new instances
    // DOES NOT check that the data or type of the instances is valid
    public async applyInstanceChanges(workspaceId: number, deleteIds?: number[], createInstances?: InstanceProps[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction([WORKSPACE_STORE, INSTANCE_STORE], "readwrite");
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);
            const instanceStore = tx.objectStore(INSTANCE_STORE);

            const getReq = workspaceStore.getKey(workspaceId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                if ( !getReq.result) {
                    abortReason = `Error applying instance changes: Workspace with id ${workspaceId} not found`;
                    tx.abort();
                    return;
                }

                deleteIds?.forEach((id) => {
                    instanceStore.delete([workspaceId, id]);
                });

                createInstances?.forEach((instance) => {
                    if (instance.type === ViewTypeProps.Element) delete instance.type;
                    instanceStore.add(instance);
                });
            }

            const toDelete = deleteIds ? deleteIds.length : 0;
            const toCreate = createInstances ? createInstances.length : 0;
            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db",
                        `Error applying instance changes (${toDelete} deleted, ${toCreate} created)
                        in workspace with id ${workspaceId}: ${event.target.error?.message}`
                    );
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db",
                    `Successfully applied instance changes (${toDelete} deleted, ${toCreate} created) in workspace with id ${workspaceId}`
                );
                resolve();
            }
        });
    }

    public async moveInstances(instances: InstanceMoveProps[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction(INSTANCE_STORE, "readwrite");
            const store = tx.objectStore(INSTANCE_STORE);

            let abortReason: AbortReason;
            instances.forEach(instance => {
                const req = store.get([instance.workspaceId, instance.id]);
                req.onsuccess = () => {
                    const gottenInstance = req.result;
                    if ( !gottenInstance) {
                        if ( !abortReason) {
                            abortReason = `Error moving ${instances.length} instances: Instance with id ${instance.id} not found in workspace with id ${instance.workspaceId}`;
                        }
                        tx.abort();
                        return;
                    }
                    gottenInstance.x = instance.x;
                    gottenInstance.y = instance.y;
                    gottenInstance.zIndex = instance.zIndex;
                    store.put(gottenInstance);
                }
            });

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db",
                        `Error moving ${instances.length} instances: ${event.target.error?.message}`
                    );
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Successfully moved ${instances.length} instances`);
                resolve();
            }
        });
    }

    // todo - and other functions, that load and export whole savefiles (or workspaces in the future?)

    private deleteAllByIndex(store: IDBObjectStore, indexName: string, key: IDBValidKey) {
        const req = store
            .index(indexName)
            .getAllKeys(IDBKeyRange.only(key));
        req.onsuccess = () => {
            const matchedKeys = req.result;
            for (const primaryKey of matchedKeys) {
                store.delete(primaryKey);
            }
        }
    }

    public async getWorkspaces(saveId: number): Promise<WorkspaceProps[]> {
        return this.getAllByIndex<WorkspaceProps>(WORKSPACE_STORE, SAVE_ID_INDEX, saveId);
    }

    public async getElements(saveId: number): Promise<ElementProps[]> {
        return this.getAllByIndex<ElementProps>(ELEMENT_STORE, SAVE_ID_INDEX, saveId);
    }

    public async getInstances(workspaceId: number): Promise<InstanceProps[]> {
        return this.getAllByIndex<InstanceProps>(INSTANCE_STORE, WORKSPACE_ID_INDEX, workspaceId);
    }

    private getAllByIndex<T>(store: string, index: string, key: number): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            const req = this._db
                .transaction(store, "readonly")
                .objectStore(store)
                .index(index)
                .getAll(IDBKeyRange.only(key));

            req.onerror = (event: IDBTransactionEvent) => {
                app.logger.log("error", "db",
                    `Failed to load ${store} for ${index} ${key}: ${event.target.error?.message}`
                );
                event.stopPropagation();
                reject();
            }

            req.onsuccess = () => {
                app.logger.log("info", "db", `Successfully retrieved all ${store} for ${index} ${key}`);
                resolve(req.result);
            }
        });
    }

    // to log all unhandled aborted transactions
    private handleAbort = (event) => {
        app.logger.log("error", "db", `IndexedDB error: Transaction aborted: ${event.target.error?.message}`);
    }

    public async testPropagation(): Promise<string> {
        return new Promise<string>(async () => {
            this._db.onerror = (event: IDBTransactionEvent) => {
                console.log("db.onerror: ", event.target.error?.message);
            }
            this._db.onabort = (event: IDBTransactionEvent) => {
                console.log("db.onabort: ", event.target.error?.message);
            }

            const tx = this._db.transaction(SETTINGS_STORE, "readwrite");
            const store = tx.objectStore(SETTINGS_STORE);

            store.add({id: 1});

            const keyReq = store.add({id: 1});
            keyReq.onerror = () => {
                console.log("keyReq.onerror", keyReq.result, keyReq.error?.message);
            }
            keyReq.onsuccess = () => {
                console.log("keyReq.onsuccess", keyReq.result, keyReq.error?.message);
            }

            const keyReq2 = store.add({id: 2});
            keyReq2.onerror = () => {
                console.log("keyReq2.onerror", keyReq2.result, keyReq2.error?.message);
            }
            keyReq2.onsuccess = () => {
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
