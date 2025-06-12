import "./board.css";
import "./workspace.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";


export class Workspaces implements IComponent {
    private readonly list: HTMLDivElement;

    constructor() {
        this.list = <HTMLDivElement>document.getElementById("workspaces-list");

        app.state._saveLoaded.subscribe(this.onSaveLoaded);
    }

    private onSaveLoaded = () => {
        console.log("onSaveLoaded hook");
        this.list.innerHTML = "";
        [...app.state.workspaces]
            .sort((a, b) => {
                return a.position - b.position;
            })
            .forEach((ws) => {
                const wsDiv = <HTMLDivElement>document.createElement("div");
                wsDiv.id = `workspace-tab-${ws.id}`;
                wsDiv.classList.add("workspace-tab");
                wsDiv.innerText = ws.name;
                this.list.append(wsDiv);
            });
    }
}
