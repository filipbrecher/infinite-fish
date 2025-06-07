import {Database} from "./storage/Database";
import {Sidebar} from "./sidebar/Sidebar";
import {Logger} from "./log/Logger";
import {SettingsManager} from "./managers/SettingsManager";


export class App {
    private _logger: Logger;
    private _database: Database;
    private _settingsManager: SettingsManager;
    private _sidebar: Sidebar;

    public get logger() { return this._logger; }
    public get database() { return this._database; }
    public get settingsManager() { return this._settingsManager; }
    public get sidebar() { return this._sidebar; }

    public async init() {
        // setup site structure
        this._logger = new Logger();
        this._sidebar = new Sidebar();

        // setup db
        this._database = new Database();
        if ( !await this.database.connect()) {
            return;
        }

        // load data from db
        this._settingsManager = new SettingsManager();
        if ( !await this._settingsManager.init()) {
            return;
        }

        const saves = await this._database.loadSaveInfo();
        if ( !saves) {
            return;
        }
    }
}
