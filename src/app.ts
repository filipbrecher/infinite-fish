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
            // temp
            indexedDB.deleteDatabase("infinite-fish");

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

            await this._databaseService.createNewSave()
            await this._databaseService.renameSave(1, "baba");
            await this._databaseService.createWorkspace(1, "workspace 1");
            await this._databaseService.createWorkspace(1, "workspace 2");
            await this._databaseService.updateWorkspace(2, {name: "workspace 2 updated"});
            await this._databaseService.moveWorkspace(2, 1);
            await this._databaseService.moveWorkspace(2, 2);
            await this._databaseService.createWorkspace(1, "workspace 3");
            await this._databaseService.createWorkspace(1, "workspace 4");
            await this._databaseService.createWorkspace(1, "workspace 5");
            await this._databaseService.moveWorkspace(2, 4);
            await this._databaseService.deleteWorkspace(3);
        } catch (e) {
            return;
        }
    }
}
