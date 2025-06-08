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
        try {
            // setup site structure
            this._logger = new Logger();
            this._sidebar = new Sidebar();

            // setup db
            this._databaseService = new DatabaseService();
            await this._databaseService.connect();

            // load data from db
            this._settingsService = new SettingsService();
            await this._settingsService.init();

            const saves = await this._databaseService.loadSaveInfo();
        } catch (e) {
            return;
        }
    }
}
