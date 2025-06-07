import {
    DATABASE_NAME,
    DATABASE_VERSION,
    ELEMENT_STORE,
    INSTANCE_STORE,
    SAVE_STORE, type Settings,
    SETTINGS_KEY,
    SETTINGS_STORE,
    WORKSPACE_STORE
} from "./types";
import {app} from "../main";
import {DEFAULT_SETTINGS} from "../settings/SettingsManager";

// todo - either disable multiple tabs (detect with broadcast channel)
//      - or make a system to lock a certain save, then any other tab may not modify or access that save
// todo - write to db always in one transaction (like write new element, add new instance, delete old instances, update save metadata)

export class Database {
    private _db: IDBDatabase;

    // connect and create if needed
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
        elementStore.createIndex("saveId", "saveId", { unique: false });

        const workspaceStore = this._db.createObjectStore(WORKSPACE_STORE, { keyPath: "id", autoIncrement: true });
        workspaceStore.createIndex("saveId", "saveId", { unique: false });

        const instanceStore = this._db.createObjectStore(INSTANCE_STORE, { keyPath: "id", autoIncrement: true });
        instanceStore.createIndex("workspaceId", "workspaceId", { unique: false });

        app.logger.log("info", "db", "IndexedDB upgrade complete");
    }

    private async onOpenSuccess(request: IDBOpenDBRequest, resolve) {
        this._db = request.result;

        this._db.onerror = this.handleError;
        this._db.onabort = this.handleAbort;

        app.logger.log("info", "db", "IndexedDB opened successfully");
        resolve(true);
    }

    public async loadSettings(): Promise<Settings | null> {
        return new Promise<Settings>((resolve) => {
            const req = this._db
                .transaction([SETTINGS_STORE], "readonly")
                .objectStore(SETTINGS_STORE)
                .get(SETTINGS_KEY);

            req.onerror = () => {
                app.logger.log("error", "db", `Error reading settings: ${req.error?.message}`);
                resolve(null);
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

    public async saveSettings(settings: Settings): Promise<boolean> {
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

    // private async prepareSaves(store: IDBObjectStore): Promise<boolean> {
    //     return new Promise<boolean>((resolve) => {
    //         resolve(true);
    //     });
    // }

    // loads the most recently modified / created save and its one workspace (if it has one)
    // todo - figure out exact return values / types
    public async load(): Promise<boolean> {

    }

    private handleError = (event) => {
        app.logger.log("error", "db", `IndexedDB error: ${event.target.error?.message}`);
    }

    private handleAbort = (event) => {
        app.logger.log("error", "db", `Transaction aborted`);
    }
}
