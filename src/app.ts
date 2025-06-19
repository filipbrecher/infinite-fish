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
            document.addEventListener("contextmenu", App.preventContextMenu, { capture: true });
            document.addEventListener("wheel", App.preventDefaultZoom, { capture: true, passive: false });

            // setup logger, db and settings
            this._logger = new Logger();

            // await this.resetDb();

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

    private static preventContextMenu = (e: Event) => {
        e.preventDefault();
    }

    private static preventDefaultZoom = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    };

    public async resetDb() {
        indexedDB.deleteDatabase("infinite-fish");

        const db = new DatabaseService();
        await db.connect();

        await db.createNewSave(".. .  .   .    .     .");
        await db.createNewSave("ahojky");
        await db.createNewSave("lots of stuff here :)");

        for (let i = 0; i < 100; i++) {
            await db.upsertElement({saveId: 3, id: i + 4, emoji: "💧", text: `Water ${i}`, discovery: i % 7 === 0, recipe: [9, i - 1] });
        }
        await db.createWorkspace(3, "ws2");
        await db.createWorkspace(3, "ws3");
        await db.createWorkspace(3, "The fourth workspace is this one :)");
        await db.createWorkspace(3, "ws5");
        await db.createWorkspace(3, "ws6");
        await db.createWorkspace(3, "ws7");
        await db.createWorkspace(3, "ws8");
        await db.createWorkspace(3, "ws9");
        await db.createWorkspace(3, "ws10");
    }
}
