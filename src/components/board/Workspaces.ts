import "./workspace.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import type {WorkspaceProps} from "../../types/db/schema";


export class Workspaces implements IComponent {
    private readonly list: HTMLDivElement;
    private activeWsId: number | undefined;

    private tabs: Map<number, HTMLDivElement> = new Map();

    constructor() {
        this.list = document.getElementById("workspaces-list") as HTMLDivElement;
        this.list.addEventListener("mousedown", this.stopPropagation);

        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._workspaceUnloaded.subscribe(this.onWorkspaceUnloaded);

        app.state._saveLoaded.subscribe(this.onSaveLoaded);
        app.state._workspaceLoaded.subscribe(this.onWorkspaceLoaded);
    }

    private onSaveUnloaded = () => {
        this.list.innerHTML = "";
        this.activeWsId = undefined;
        this.tabs = new Map();
    }

    private onSaveLoaded = () => {
        [...app.state.workspaces.values()]
            .sort((a, b) => {
                return a.position - b.position;
            })
            .forEach((ws) => {
                const wrapper = document.createElement("div") as HTMLDivElement;
                wrapper.classList.add("tab-wrapper");

                const dots = document.createElement("div") as HTMLDivElement;
                dots.classList.add("tab-dots");
                dots.classList.add("icon");
                dots.classList.add("mask-icon");
                dots.classList.add("button-icon");

                const name = document.createElement("span") as HTMLSpanElement;
                name.classList.add("tab-name");
                name.innerText = `${ws.name}`;

                // wsDiv.setAttribute("contenteditable", "true");

                wrapper.append(dots, name);
                wrapper.addEventListener("click", (e: MouseEvent) => {this.onClickWorkspace(e, ws.id)});

                this.list.append(wrapper);
                this.tabs.set(ws.id, wrapper);
            });
    }

    private onWorkspaceUnloaded = () => {}

    private onClickWorkspace = (e: MouseEvent, id: number) => {
        if (this.activeWsId === id) return;
        app.state.loadWorkspace(id).catch();
        e.stopPropagation();
    }

    private onWorkspaceLoaded = (ws: WorkspaceProps) => {
        if (this.activeWsId !== undefined) {
            this.tabs.get(this.activeWsId).classList.toggle("active", false);
        }
        this.activeWsId = ws.id;
        this.tabs.get(this.activeWsId).classList.toggle("active", true);
    }

    private stopPropagation = (e: Event) => {
        e.stopPropagation();
    }
}
