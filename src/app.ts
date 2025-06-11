import {DatabaseService} from "./services/DatabaseService";
import {Sidebar} from "./components/sidebar/Sidebar";
import {Logger} from "./services/Logger";
import {Options} from "./components/options/Options";
import {StateService} from "./services/StateService";
import {SettingsService} from "./services/SettingsService";


export class App {
    private _logger: Logger;
    private _database: DatabaseService;
    private _settings: SettingsService;
    private _state: StateService;

    private _sidebar: Sidebar;
    private _options: Options;

    public get logger() { return this._logger; }
    public get settings() { return this._settings; }
    public get database() { return this._database; }
    public get state() { return this._state; }

    public get options() { return this._options; }

    public async init() {
        try {
            // indexedDB.deleteDatabase("infinite-fish");

            // setup logger, db and settings
            this._logger = new Logger();
            this._database = new DatabaseService();
            await this._database.connect();
            this._settings = new SettingsService();
            await this._settings.init();

            // prepare components
            this._sidebar = new Sidebar();
            this._sidebar.prepare();
            this._options = new Options();
            this._options.prepare();

            // setup state, load save
            this._state = new StateService();
            await this._state.init();
        } catch (e) {
            return;
        }
    }
}
