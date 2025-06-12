import {DatabaseService} from "./services/DatabaseService";
import {Sidebar} from "./components/board/Sidebar";
import {Logger} from "./services/Logger";
import {Options} from "./components/options/Options";
import {StateService} from "./services/StateService";
import {SettingsService} from "./services/SettingsService";
import {Workspaces} from "./components/board/Workspaces";
import {Board} from "./components/board/Board";


export class App {
    private _logger: Logger;
    private _database: DatabaseService;
    private _settings: SettingsService;
    private _state: StateService;

    private _options: Options;
    private _sidebar: Sidebar;
    private _workspaces: Workspaces;
    private _board: Board;

    public get logger() { return this._logger; }
    public get settings() { return this._settings; }
    public get database() { return this._database; }
    public get state() { return this._state; }

    public async init() {
        try {
            // indexedDB.deleteDatabase("infinite-fish");

            // setup logger, db and settings
            this._logger = new Logger();
            this._database = new DatabaseService();
            await this._database.connect();
            this._settings = new SettingsService();
            await this._settings.init();

            // setup state service
            this._state = new StateService();

            // prepare components
            this._options = new Options();
            this._sidebar = new Sidebar();
            this._workspaces = new Workspaces();
            this._board = new Board();

            // load save
            await this._state.init();
        } catch (e) {
            return;
        }
    }
}
