import {Logger} from "../log/Logger";
import {
    DATABASE_NAME,
    DATABASE_VERSION,
    ELEMENT_STORE,
    INSTANCE_STORE,
    SAVE_STORE,
    SETTINGS_STORE,
    WORKSPACE_STORE
} from "./types";

// todo - either disable multiple tabs (detect with broadcast channel)
//      - or make a system to lock a certain save, then any other tab may not modify or access that save
// todo - write to db always in one transaction (like write new element, add new instance, delete old instances, update save metadata)

export class Database {
    private db: IDBDatabase;

    // connect and create if needed
    public async connect(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {

            const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onsuccess = () => {
                this.db = request.result;
                Logger.log("info", "db", "IndexedDB opened successfully.");
                resolve(true);
            }

            request.onerror = () => {
                Logger.log("error", "db", "Error occurred when accessing IndexedDB.");
                reject(false);
            }

            request.onupgradeneeded = () => {
                this.db = request.result;

                this.db.createObjectStore(SETTINGS_STORE, { keyPath: "id", autoIncrement: false });

                this.db.createObjectStore(SAVE_STORE, { keyPath: "id", autoIncrement: true });

                const elementStore = this.db.createObjectStore(ELEMENT_STORE, { keyPath: "id", autoIncrement: true });
                elementStore.createIndex("saveId", "saveId", { unique: false });

                const workspaceStore = this.db.createObjectStore(WORKSPACE_STORE, { keyPath: "id", autoIncrement: true });
                workspaceStore.createIndex("saveId", "saveId", { unique: false });

                const instanceStore = this.db.createObjectStore(INSTANCE_STORE, { keyPath: "id", autoIncrement: true });
                instanceStore.createIndex("workspaceId", "workspaceId", { unique: false });

                Logger.log("info", "db", "IndexedDB upgrade complete.");
                resolve(true);
            }
        });
    }

    // check for issues with the data in the database, fix it, and if empty initialize with default values
    // after this successfully finishes, the database should be in a loadable state
    public async prepare(): Promise<boolean> {

    }

    // loads the most recently modified / created save and its one workspace (if it has one)
    // todo - figure out exact return values / types
    public async load(): Promise<boolean> {

    }
}
