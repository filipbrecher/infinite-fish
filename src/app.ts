import {DatabaseService} from "./services/DatabaseService";
import {Sidebar} from "./sidebar/Sidebar";
import {Logger} from "./services/Logger";
import {SettingsService} from "./services/SettingsService";


export class App {
    private _logger: Logger;
    private _databaseService: DatabaseService;
    private _settingsService: SettingsService;
    private _sidebar: Sidebar;

    public get logger() { return this._logger; }
    public get databaseService() { return this._databaseService; }
    public get settingsService() { return this._settingsService; }
    public get sidebar() { return this._sidebar; }

    public async init() {
        // setup site structure
        this._logger = new Logger();
        this._sidebar = new Sidebar();

        // setup db
        this._databaseService = new DatabaseService();
        if ( !await this.databaseService.connect()) {
            return;
        }

        // load data from db
        this._settingsService = new SettingsService();
        if ( !await this._settingsService.init()) {
            return;
        }

        const saves = await this._databaseService.loadSaveInfo();
        if ( !saves) {
            return;
        }
    }
}
