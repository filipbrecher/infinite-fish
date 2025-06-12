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
    Instance, NewElement, NewInstance, Recipe,
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
// todo - pinned elements / or just folder system altogether (basically like workspaces, but with unique ordered items)

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

    public async loadSaveInfo(): Promise<Save[]> {
        let saves: Save[];

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
                saves = req.result;
                resolve();
            }
        });

        app.logger.log("info", "db", "Save info loaded successfully");
        return saves;
    }

    public async createNewSave(name: string = DEFAULT_SAVE_NAME): Promise<Save> {
        return new Promise<Save>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);

            const now = Date.now();
            const save: Partial<Save> = {
                ...DEFAULT_SAVE,
                name: name,
                datetimeCreated: now,
                datetimeActive: now,
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

    public async updateActiveTimeOfSave(saveId: number, datetime: number): Promise<void> {
        return this.updateSave(
            saveId,
            (save: Save) => {
                save.datetimeActive = datetime;
            },
            (pastTense: boolean) => {
                return `${pastTense ? "updated" : "updating"} lastActiveAt of save with id ${saveId}`;
            }
        );
    }

    public async renameSave(saveId: number, newName: string): Promise<void> {
        return this.updateSave(
            saveId,
            (save: Save) => {
                save.name = newName;
            },
            (pastTense: boolean) => {
                return `${pastTense ? "renamed" : "renaming"} save with id ${saveId} to '${newName}'`;
            }
        );
    }

    private async updateSave(
        saveId: number,
        updateSave: (save: Save) => void,
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

    // always creates a new element with the specified values
    // DOES NOT check whether the element with this text exists or doesn't exist
    // DOES NOT check that the ids of the elements in the recipe are valid within that save
    // returns id of the element
    public async addNewElement(saveId: number, element: NewElement, recipe?: Recipe): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const elementStore =tx.objectStore(ELEMENT_STORE);
            const getReq = saveStore.getKey(saveId);

            let addedElement: Partial<Element>;
            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                if ( !getReq.result) {
                    abortReason = `Error adding element '${element.text}' with recipe [${recipe}] to save with id ${saveId}: Save not found`;
                    tx.abort();
                    return;
                }

                addedElement = {
                    saveId: saveId,
                    emoji: element.emoji,
                    text: element.text,
                }
                if (element.discovery) {
                    addedElement.discovery = true;
                }
                if (recipe) {
                    addedElement.recipes = [recipe];
                }

                const req = elementStore.add(addedElement);
                req.onsuccess = () => {
                    addedElement.id = <number>req.result;

                    this.updateSaveInfo(
                        saveStore,
                        saveId,
                        addedElement.id,
                        (save: Save) => {
                            save.elementCount++;
                            save.recipeCount += recipe ? 1 : 0;
                            save.discoveryCount += element.discovery ? 1 : 0;
                        },
                        (pastTense: boolean) => {
                            return `add${pastTense ? "ed" : "ing"} element '${element.text}' with recipe [${recipe}] to it`;
                        }
                    );
                }
            }

            tx.onabort = (event: IDBTransactionEvent) => {
                if (abortReason) {
                    app.logger.log("error", "db", abortReason);
                } else {
                    app.logger.log("error", "db",
                        `Error adding element '${element.text}' with recipe [${recipe}] to save with id ${saveId}: ${event.target.error?.message}`
                    );
                }
                event.stopPropagation();
                reject();
            }

            tx.oncomplete = () => {
                app.logger.log("info", "db", `Element '${element.text}' successfully added to save with id ${saveId}`);
                resolve(addedElement.id);
            }
        });
    }

    // this must be called after the element has been successfully added
    // DOES NOT check that the ids of the elements in the recipe are valid within that save
    public async addRecipe(elementId: number, recipe: Recipe, discovery: boolean): Promise<void> {
        if (recipe[0] > recipe[1]) recipe.reverse();
        let recipeAdded = false;
        let isNewDiscovery = false;
        return this.updateElement(
            elementId,
            (element: Element) => {
                if (element.recipes?.some(r => r[0] === recipe[0] && r[1] === recipe[1])) {
                    return;
                } else if (element.recipes) {
                    element.recipes.push(recipe);
                } else {
                    element.recipes = [recipe];
                }
                if (discovery && !element.discovery) {
                    element.discovery = true;
                    isNewDiscovery = true;
                }
            },
            (save: Save) => {
                if (recipeAdded) {
                    save.recipeCount++;
                }
                if (isNewDiscovery) {
                    save.discoveryCount++;
                }
            },
            (pastTense: boolean) => {
                return `add${pastTense ? "ed" : "ing"} recipe [${recipe}] to element with id ${elementId}`;
            }
        );
    }

    public async updateElementVisibility(elementId: number, hide: boolean): Promise<void> {
        return this.updateElement(
            elementId,
            (element: Element) => {
                element.hide = hide;
                if ( !hide) {
                    delete element.hide;
                }
            },
            () => {},
            (pastTense: boolean) => {
                return `updat${pastTense ? "ed" : "ing"} visibility of element with id ${elementId}`;
            }
        );
    }

    private async updateElement(
        elementId,
        update: (element: Element) => void,
        updateSave: (save: Save) => void,
        getLogEnding: (pastTense: boolean) => string,
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction([SAVE_STORE, ELEMENT_STORE], "readwrite");
            const saveStore = tx.objectStore(SAVE_STORE);
            const elementStore = tx.objectStore(ELEMENT_STORE);

            const getReq = elementStore.get(elementId);

            let abortReason: AbortReason;
            getReq.onsuccess = () => {
                const element = getReq.result;
                if ( !element) {
                    abortReason = `Error ${getLogEnding(false)}: Element not found`;
                    tx.abort();
                    return;
                }

                update(element);
                elementStore.put(element);

                this.updateSaveInfo(saveStore, element.saveId, elementId, updateSave, getLogEnding);
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

    private updateSaveInfo(
        saveStore: IDBObjectStore,
        saveId: number,
        elementId: number,
        update: (save: Save) => void,
        getLogEnding: (pastTense: boolean) => string,
    ): void {
        const getSaveReq = saveStore.get(saveId);

        getSaveReq.onerror = (event: IDBTransactionEvent) => {
            app.logger.log("error", "db",
                `Error updating save info when ${getLogEnding(false)}: ${event.target.error?.message}`
            );
            event.stopPropagation();
            event.preventDefault();
        }

        getSaveReq.onsuccess = () => {
            const save = getSaveReq.result;
            if ( !save) {
                app.logger.log("error", "db",
                    `Error updating save info when ${getLogEnding(false)} element with id ${elementId}: Save with id ${saveId} not found`
                );
                return;
            }

            update(save);
            const req = saveStore.put(save);
            req.onerror = (event: IDBTransactionEvent) => {
                app.logger.log("error", "db",
                    `Error updating save info when ${getLogEnding(false)} element with id ${elementId}: ${event.target.error?.message}`
                );
                event.stopPropagation();
                event.preventDefault();
            }
        }
    }

    // delete and/or create new instances
    // DOES NOT check that the data or type of the instances is valid
    public async applyInstanceChanges(workspaceId: number, deleteIds?: number[], createInstances?: NewInstance[]): Promise<Instance[]> {
        return new Promise<Instance[]>((resolve, reject) => {
            const tx = this._db.transaction([WORKSPACE_STORE, INSTANCE_STORE], "readwrite");
            const workspaceStore = tx.objectStore(WORKSPACE_STORE);
            const instanceStore = tx.objectStore(INSTANCE_STORE);

            const getReq = workspaceStore.getKey(workspaceId);

            let abortReason: AbortReason;
            let newInstances: Instance[] = [];
            getReq.onsuccess = () => {
                if ( !getReq.result) {
                    abortReason = `Error applying instance changes: Workspace with id ${workspaceId} not found`;
                    tx.abort();
                    return;
                }

                // delete them
                deleteIds?.forEach((id) => {
                    instanceStore.delete(id);
                });

                // create them
                createInstances?.forEach((instanceToCreate) => {
                    let instance = {
                        ...instanceToCreate,
                        workspaceId: workspaceId,
                    }
                    const req = instanceStore.add(instance);
                    req.onsuccess = () => {
                        newInstances.push({
                            ...instance,
                            id: <number>req.result,
                        });
                    }
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
                resolve(newInstances);
            }
        });
    }

    public async moveInstances(instances: Instance[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const tx = this._db.transaction(INSTANCE_STORE, "readwrite");
            const store = tx.objectStore(INSTANCE_STORE);

            let abortReason: AbortReason;
            instances.forEach((instance: Instance) => {
                const req = store.get(instance.id);
                req.onsuccess = () => {
                    const gottenInstance = req.result;
                    if ( !gottenInstance) {
                        if ( !abortReason) {
                            abortReason = `Error moving ${instances.length} instances: Instance with id ${instance.id} not found`;
                        }
                        tx.abort();
                        return;
                    }
                    gottenInstance.x = instance.x;
                    gottenInstance.y = instance.y;
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

    public async getWorkspaces(saveId: number): Promise<Workspace[]> {
        return this.getAllByIndex<Workspace>(WORKSPACE_STORE, SAVE_ID_INDEX, saveId);
    }

    public async getElements(saveId: number): Promise<Element[]> {
        return this.getAllByIndex<Element>(ELEMENT_STORE, SAVE_ID_INDEX, saveId);
    }

    public async getInstances(workspaceId: number): Promise<Instance[]> {
        return this.getAllByIndex<Instance>(INSTANCE_STORE, WORKSPACE_ID_INDEX, workspaceId);
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
