import {
    DATABASE_NAME,
    DATABASE_VERSION,
    ELEMENT_STORE,
    INSTANCE_STORE,
    SAVE_STORE,
    SETTINGS_STORE,
    WORKSPACE_STORE
} from "./types";
import {app} from "../main";

// todo - either disable multiple tabs (detect with broadcast channel)
//      - or make a system to lock a certain save, then any other tab may not modify or access that save
// todo - write to db always in one transaction (like write new element, add new instance, delete old instances, update save metadata)

export class Database {
    private _db: IDBDatabase;
    private _ready: boolean = false;
    public get ready() {
        return this._ready;
    }

    // connect and create if needed
    public async connect(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {

            const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onsuccess = () => {
                this._db = request.result;
                app.logger.log("info", "db", "IndexedDB opened successfully.");

                this._db.onerror = this.handleError;
                this._db.onabort = this.handleAbort;

                resolve(true);
            }

            request.onerror = () => {
                app.logger.log("error", "db", "Error occurred when accessing IndexedDB.");
                reject();
            }

            request.onupgradeneeded = () => {
                this._db = request.result;

                this._db.createObjectStore(SETTINGS_STORE, { keyPath: "id", autoIncrement: false });

                this._db.createObjectStore(SAVE_STORE, { keyPath: "id", autoIncrement: true });

                const elementStore = this._db.createObjectStore(ELEMENT_STORE, { keyPath: "id", autoIncrement: true });
                elementStore.createIndex("saveId", "saveId", { unique: false });

                const workspaceStore = this._db.createObjectStore(WORKSPACE_STORE, { keyPath: "id", autoIncrement: true });
                workspaceStore.createIndex("saveId", "saveId", { unique: false });

                const instanceStore = this._db.createObjectStore(INSTANCE_STORE, { keyPath: "id", autoIncrement: true });
                instanceStore.createIndex("workspaceId", "workspaceId", { unique: false });

                app.logger.log("info", "db", "IndexedDB upgrade complete.");
                resolve(true);
            }
        });
    }

    private handleError = (event) => {
        app.logger.log("error", "db", `IndexedDB error: ${event.target.error?.message}`);
    }

    private handleAbort = (event) => {
        app.logger.log("error", "db", `Transaction aborted.`);
    }

    // check for issues with the data in the database, fix it, and if empty initialize with default values
    // after this successfully finishes, the database should be in a loadable state
    public async prepare(): Promise<boolean> {
        // stuff

        this._ready = true;
    }

    // loads the most recently modified / created save and its one workspace (if it has one)
    // todo - figure out exact return values / types
    public async load(): Promise<boolean> {

    }
}
