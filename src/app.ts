import {DatabaseService} from "./services/DatabaseService";
import {Logger} from "./services/Logger";
import {Options} from "./components/options/Options";
import {StateService} from "./services/StateService";
import {SettingsService} from "./services/SettingsService";
import {Board} from "./components/board/Board";
import {InputCaptureService} from "./services/InputCaptureService";
import {AudioService} from "./services/AudioService";
import type {IComponent} from "./components/IComponent";
import {PopupService} from "./services/PopupService";


export class App {
    private _logger: Logger;
    private _audio: AudioService;
    private _popup: PopupService;
    private _database: DatabaseService;
    private _settings: SettingsService;
    private _state: StateService;
    private _inputCapture: InputCaptureService;

    private _options: IComponent;
    private _board: IComponent;

    public get logger() { return this._logger; }
    public get audio() { return this._audio; }
    public get popup() { return this._popup; }
    public get settings() { return this._settings; }
    public get database() { return this._database; }
    public get state() { return this._state; }
    public get inputCapture() { return this._inputCapture; }

    public async init() {
        try {
            document.addEventListener("contextmenu", App.preventContextMenu, { capture: true });
            document.addEventListener("wheel", App.preventDefaultZoom, { capture: true, passive: false });
            document.addEventListener("mousedown", App.preventAutoscroll, { capture: true });

            // setup default settings, logger, audio, popup
            this._settings = new SettingsService();
            this._logger = new Logger();
            this._audio = new AudioService();
            this._popup = new PopupService();

            // await this.resetDb();

            // connect to db
            this._database = new DatabaseService();
            await this._database.connect();

            // load settings and setup input capture
            await this._settings.init();
            this._inputCapture = new InputCaptureService();
            await this._inputCapture.init();

            // setup state service
            this._state = new StateService();

            // prepare components
            this._options = new Options();
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

    private static preventAutoscroll = (e: MouseEvent) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    }

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
