import {DatabaseService} from "./services/DatabaseService";
import {Sidebar} from "./ui/Sidebar";
import {Logger} from "./services/Logger";
import {SettingsService} from "./services/SettingsService";
import {Options} from "./ui/Options";


export class App {
    private _logger: Logger;
    private _databaseService: DatabaseService;
    private _settingsService: SettingsService;

    private _sidebar: Sidebar;
    private _options: Options;

    public get logger() { return this._logger; }
    public get databaseService() { return this._databaseService; }
    public get settingsService() { return this._settingsService; }

    public async init() {
        try {
            // indexedDB.deleteDatabase("infinite-fish");

            // setup site structure
            this._logger = new Logger();
            this._sidebar = new Sidebar();
            this._options = new Options();

            // setup db
            this._databaseService = new DatabaseService();
            await this._databaseService.connect();

            // load data from db
            this._settingsService = new SettingsService();
            await this._settingsService.init();


        } catch (e) {
            return;
        }
    }
}
