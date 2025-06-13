import "./board.css";
import "./workspace.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";


export class Workspaces implements IComponent {
    private readonly list: HTMLDivElement;
    private activeWsId: number | undefined;

    constructor() {
        this.list = <HTMLDivElement>document.getElementById("workspaces-list");

        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._workspaceUnloaded.subscribe(this.onWorkspaceUnloaded);

        app.state._saveLoaded.subscribe(this.onSaveLoaded);
        app.state._workspaceLoaded.subscribe(this.onWorkspaceLoaded);
    }

    private onSaveUnloaded = () => {
        this.list.innerHTML = "";
        this.activeWsId = undefined;
    }

    private onSaveLoaded = () => {
        [...app.state.workspaces.values()]
            .sort((a, b) => {
                return a.position - b.position;
            })
            .forEach((ws) => {
                const wsDiv = <HTMLDivElement>document.createElement("div");
                wsDiv.id = `workspace-${ws.id}`;
                wsDiv.classList.add("workspace");
                wsDiv.innerText = ws.name;

                wsDiv.addEventListener("click", this.onClickWorkspace);

                this.list.append(wsDiv);
            });
    }

    private onWorkspaceUnloaded = () => {
        if (this.activeWsId) {
            this.list.querySelector(`#workspace-${this.activeWsId}`).classList.remove("active");
        }
    }

    private onClickWorkspace = (event) => {
        const id = Number(event.target.id.slice(10));
        if (this.activeWsId === id) return;
        app.state.loadWorkspace(id).catch();
        event.stopPropagation();
    }

    private onWorkspaceLoaded = () => {
        this.activeWsId = app.state.activeWorkspace?.id;
        this.list.querySelector(`#workspace-${this.activeWsId}`).classList.add("active");
    }
}
