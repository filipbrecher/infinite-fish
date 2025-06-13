import {DatabaseService} from "./services/DatabaseService";
import {Sidebar} from "./components/board/Sidebar";
import {Logger} from "./services/Logger";
import {Options} from "./components/options/Options";
import {StateService} from "./services/StateService";
import {SettingsService} from "./services/SettingsService";
import {Workspaces} from "./components/board/Workspaces";
import {Board} from "./components/board/Board";
import {InputCaptureService} from "./services/InputCaptureService";
import type {IComponent} from "./components/IComponent";


export class App {
    private _logger: Logger;
    private _database: DatabaseService;
    private _settings: SettingsService;
    private _state: StateService;
    private _inputCapture: InputCaptureService;

    private _options: IComponent;
    private _sidebar: IComponent;
    private _workspaces: IComponent;
    private _board: IComponent;

    public get logger() { return this._logger; }
    public get settings() { return this._settings; }
    public get database() { return this._database; }
    public get state() { return this._state; }
    public get inputCapture() { return this._inputCapture; }

    public async init() {
        try {
            // indexedDB.deleteDatabase("infinite-fish");

            // setup logger, db and settings
            this._logger = new Logger();
            this._database = new DatabaseService();
            await this._database.connect();
            this._settings = new SettingsService();
            await this._settings.init();
            this._inputCapture = new InputCaptureService();
            await this._inputCapture.init();

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
