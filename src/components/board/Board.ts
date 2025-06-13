import "./board.css"
import {app} from "../../main";
import type {IComponent} from "../IComponent";
import {Instance} from "./objects/Instance";


export class Board implements IComponent {
    private readonly board: HTMLDivElement;
    private readonly dragLayer: HTMLDivElement;
    private instances: Map<number, Instance> = new Map();

    private offsetX: number;
    private offsetY: number;
    private scale: number;

    constructor() {
        this.board = <HTMLDivElement>document.getElementById("board");
        this.dragLayer = <HTMLDivElement>document.getElementById("drag-layer");

        app.state._workspaceUnloaded.subscribe(this.onWorkspaceUnloaded);
        app.state._workspaceLoaded.subscribe(this.onWorkspaceLoaded);
    }

    private onWorkspaceUnloaded = () => {
        this.instances.forEach(i => i.removeDiv());
        this.instances = new Map();
    }

    private onWorkspaceLoaded = () => {
        this.offsetX = app.state.activeWorkspace!.x;
        this.offsetY = app.state.activeWorkspace!.y;
        this.scale = app.state.activeWorkspace!.scale;

        app.state.instances.forEach((props) => {
            const instance = new Instance(props);
            const div = instance.getDiv();
            if ( !div) return;

            this.instances.set(props.id, instance);
            this.board.appendChild(div);
        });
        this.instances.forEach((i) => {
            i.calculateSize();
        })
    }
}
