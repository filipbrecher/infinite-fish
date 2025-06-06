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

export class Database {
    private static db: IDBDatabase;

    public static async setup(): Promise<boolean> {
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
                this.db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
                this.db.createObjectStore(SAVE_STORE, { keyPath: "id" });
                this.db.createObjectStore(ELEMENT_STORE, { keyPath: ["save_id", "id"] });
                this.db.createObjectStore(WORKSPACE_STORE, { keyPath: "id" });
                this.db.createObjectStore(INSTANCE_STORE, { keyPath: ["save_id", "workspace_id", "id"] });
                Logger.log("info", "db", "IndexedDB upgrade complete.");
                resolve(true);
            }
        });
    }
}
