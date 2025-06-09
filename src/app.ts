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

            const elId1 = await this._databaseService.addNewElement(1, {emoji: "emoji 1", text: "text 1"}, [9, 9]);
            const elId2 = await this._databaseService.addNewElement(1, {emoji: "emoji 2", text: "text 2", discovered: true}, [9, 9]);
            const elId3 = await this._databaseService.addNewElement(1, {emoji: "emoji 3", text: "text 3"}, [9, 9]);
            await this._databaseService.addRecipe(elId1, [elId2, elId3], true);
            await this._databaseService.addRecipe(elId3, [elId2, elId3], false);
            await this._databaseService.addRecipe(elId2, [elId1, elId1], true);
            await this._databaseService.updateElementVisibility(elId1, true);
            await this._databaseService.updateElementVisibility(elId1, false);

            await this._databaseService.applyInstanceChanges(1, undefined, [
                {x: 0, y: 0, data: 9},
                {x: 1, y: 1, data: 9},
                {x: 2, y: 2, data: 10},
            ]);
            await this._databaseService.applyInstanceChanges(1, [1], [{x: 3, y: 3, data: 11}]);
            await this._databaseService.moveInstances([{id: 2, workspaceId: 1, x: 5, y: 5, data: 9}]);

            await Promise.all(
                Array.from({ length: 1000 }, () =>
                    this._databaseService.addNewElement(1, {emoji: "e", text: "t", discovered: true}, [1, 1])
                )
            );
            const then = new Date().getTime();
            await this._databaseService.deleteSave(1);
            const now = new Date().getTime();

            console.log("deletion took:", (now - then) / 1000, "seconds");
        } catch (e) {
            return;
        }
    }
}
