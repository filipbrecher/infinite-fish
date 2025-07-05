import "./workspace.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import type {WorkspaceProps} from "../../types/db/schema";
import {MAX_WORKSPACE_NAME_LENGTH} from "../../constants/save";
import {Tab} from "./Tab";


export class Workspaces implements IComponent {
    private readonly list: HTMLDivElement;
    private activeWsId: number | undefined;

    private tabs: Map<number, Tab> = new Map();
    private readonly plus: HTMLDivElement;

    private menuTabId: number | undefined;
    private readonly menu: HTMLDivElement;
    private readonly options: HTMLDivElement[] = [];

    private moving: boolean = false;
    private movingId: number;
    private hoveredId: number | undefined;
    private movingConfirmed: boolean = false;
    private movingStartX: number;
    private movingStartY: number;
    private movingOffsetX: number;
    private movingOffsetY: number;
    private movingTab: HTMLSpanElement;

    constructor() {
        this.list = document.getElementById("tabs-list") as HTMLDivElement;
        this.list.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("block-board-partial", e)(e);
        });
        this.plus = document.getElementById("tabs-plus") as HTMLDivElement;
        this.plus.addEventListener("click", this.onClickPlus);
        this.plus.addEventListener("contextmenu", this.onClickPlus);

        this.menu = document.getElementById("tab-menu") as HTMLDivElement;
        this.menu.addEventListener("mousedown", (e: MouseEvent) => {
            app.inputCapture.matchMouseDown("block-board-partial", e)(e);
        });

        this.movingTab = document.getElementById("moving-tab") as HTMLSpanElement;

        const optionsList: { name: string, action: (e: MouseEvent) => void }[] = [
            { name: "rename", action: this.onClickRename },
            { name: "duplicate", action: this.onClickDuplicate },
            { name: "export", action: this.onClickExport },
            { name: "delete", action: this.onClickDelete },
            { name: "create", action: this.onClickCreate },
            { name: "import", action: this.onClickImport },
        ];
        optionsList.forEach(({name, action}) => {
            this.options[name] = document.createElement("div") as HTMLDivElement;
            this.options[name].classList.add("tab-menu-item");
            this.options[name].innerText = `${name[0].toUpperCase()}${name.slice(1)}`;
            this.options[name].addEventListener("click", action);
        })

        app.state._saveLoaded.subscribe(this.onSaveLoaded);
        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._workspaceLoaded.subscribe(this.onWorkspaceLoaded);
        app.state._workspaceCreated.subscribe(this.onWorkspaceCreated);
        app.state._workspaceMoved.subscribe(this.onWorkspaceMoved);
        app.state._workspaceDeleted.subscribe(this.onWorkspaceDeleted);
        app.state._workspaceUnloaded.subscribe(this.onWorkspaceUnloaded);
    }

    private appendWorkspace = (props: WorkspaceProps) => {
        const tab = new Tab();

        tab.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.renameWorkspace(props.id);
                e.preventDefault();
            }
        });
        tab.input.addEventListener("blur", () => {
            this.renameWorkspace(props.id);
        })

        tab.wrapper.addEventListener("click", (e: MouseEvent) => {
            this.onClickTab(e, props.id);
        });
        tab.wrapper.addEventListener("contextmenu", (e: MouseEvent) => {
            this.onRightClickTab(e, props.id);
        });
        tab.wrapper.addEventListener("mousedown", (e: MouseEvent) => {
            this.onStartMoving(e, props.id);
        });

        tab.insertBefore(this.list, this.plus);
        tab.setName(props.name);
        this.tabs.set(props.id, tab);
    }

    private onSaveUnloaded = () => {
        this.list.innerHTML = "";
        this.activeWsId = undefined;
        this.tabs = new Map();
    }

    private onSaveLoaded = () => {
        this.list.appendChild(this.plus);

        [...app.state.workspaces.values()]
            .sort((a, b) => {
                return a.position - b.position;
            })
            .forEach((ws) => {
                this.appendWorkspace(ws);
            });
    }

    private onWorkspaceUnloaded = () => {}

    private onWorkspaceCreated = (ws: WorkspaceProps) => {
        this.appendWorkspace(ws);
    }

    private onWorkspaceMoved = ({ from, ws, targetWs }: { from: number, ws: WorkspaceProps, targetWs: WorkspaceProps }) => {
        const tab = this.tabs.get(ws.id);
        const targetTab = this.tabs.get(targetWs.id);
        if ( !tab || !targetTab) return;

        let right: Node = targetTab.wrapper;
        if (targetWs.position < ws.position) right = targetTab.wrapper.nextSibling;
        tab.insertBefore(this.list, right);
    }

    private onWorkspaceDeleted = (ws: WorkspaceProps) => {
        const tab = this.tabs.get(ws.id);
        tab.remove();
        this.tabs.delete(ws.id);
        if (this.menuTabId === ws.id) this.closeMenu();
    }

    private onWorkspaceLoaded = (ws: WorkspaceProps) => {
        if (this.activeWsId !== undefined) {
            this.tabs.get(this.activeWsId).setActive(false);
        }
        this.activeWsId = ws.id;
        this.tabs.get(this.activeWsId).setActive(true);
    }

    private onStartMoving = (e: MouseEvent, id: number) => {
        if (this.moving) return;
        this.moving = true;
        this.movingId = id;
        this.hoveredId = undefined;

        const tab = this.tabs.get(id);
        this.movingTab.innerText = tab.input.value;
        this.movingStartX = e.clientX;
        this.movingStartY = e.clientY;

        const rectWrapper = tab.wrapper.getBoundingClientRect();
        const rectSpan = tab.span.getBoundingClientRect();
        const wRatio = rectSpan.width / rectWrapper.width;
        const hRatio = rectSpan.height / rectWrapper.height;
        this.movingOffsetX = (e.clientX - rectWrapper.left) * wRatio;
        this.movingOffsetY = (e.clientY - rectWrapper.top) * hRatio;

        this.movingTab.classList.toggle("active", this.activeWsId === id);

        window.addEventListener("mousemove", this.onUpdateMoving);
        window.addEventListener("mouseup", this.onEndMoving);
    }

    private onUpdateMoving = (e: MouseEvent) => {
        if ( !this.moving) return;

        if ( !this.movingConfirmed) {
            const dist = Math.sqrt((e.clientX - this.movingStartX)**2 + (e.clientY - this.movingStartY)**2);
            if (dist <= 10) return;
            this.tabs.get(this.movingId).wrapper.classList.toggle("moving", true);
            this.movingConfirmed = true;
        }

        this.movingTab.style.left = `${e.clientX - this.movingOffsetX}px`;
        this.movingTab.style.top = `${e.clientY - this.movingOffsetY}px`;
        this.movingTab.classList.toggle("show", true);

        let newHoveredId = undefined;
        for (const [id, tab] of this.tabs.entries()) {
            if (id === this.movingId) continue;
            if (tab.mouseIsOverWrapper(e.clientX, e.clientY)) {
                newHoveredId = id; break;
            }
        }

        if (this.hoveredId === newHoveredId) return;
        if (this.hoveredId !== undefined) this.tabs.get(this.hoveredId).wrapper.classList.toggle("hovered-over", false);
        this.hoveredId = newHoveredId;
        if (this.hoveredId !== undefined) this.tabs.get(this.hoveredId).wrapper.classList.toggle("hovered-over", true);
    }

    private onEndMoving = (e: MouseEvent) => {
        if ( !this.moving) return;
        this.moving = false

        if (this.movingConfirmed) {
            this.movingConfirmed = false;
            this.tabs.get(this.movingId).wrapper.classList.toggle("moving", false);
            this.movingTab.classList.toggle("show", false);

            if (this.hoveredId !== undefined) {
                this.tabs.get(this.hoveredId).wrapper.classList.toggle("hovered-over", false);
                app.state.moveWorkspace(this.movingId, this.hoveredId).catch();
            }
        }

        window.removeEventListener("mousemove", this.onUpdateMoving);
        window.removeEventListener("mouseup", this.onEndMoving);
    }

    private prepareMenuUnder(div: HTMLDivElement) {
        const tabRect = div.getBoundingClientRect();

        this.menu.style.top = `${tabRect.bottom + 12}px`;
        this.menu.style.left = `${Math.max(0, tabRect.left)}px`;

        this.menu.classList.toggle("open", true);
        window.addEventListener("mousedown", this.onOutsideMouseDown, { capture: true });
    }

    private openMenu = (id: number) => {
        this.prepareMenuUnder(this.tabs.get(id).wrapper);

        const canDelete = id !== app.state.activeWorkspace!.id || app.state.workspaces.size > 1;
        const childCount = canDelete ? 5 : 4;

        if (this.menu.children.length !== childCount) {
            while (this.menu.children.length > 1) {
                this.menu.removeChild(this.menu.lastChild);
            }
            this.menu.append(this.options["rename"], this.options["duplicate"], this.options["export"]);
            if (canDelete) {
                this.menu.appendChild(this.options["delete"]);
            }
        }

        this.menuTabId = id;
    }

    private onClickTab = (e: MouseEvent, id: number) => {
        if (this.activeWsId !== id) {
            app.state.loadWorkspace(id).catch();
            e.stopPropagation();
            return;
        } else if ((e.target as HTMLElement).classList.contains("tab-dots")) {
            this.openMenu(id);
            e.stopPropagation();
        }
    }

    private onRightClickTab = (e: MouseEvent, id: number) => {
        this.openMenu(id);
        e.stopPropagation();
    }

    private onOutsideMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (this.menu.contains(target) || target.classList.contains("tab-dots")) return;

        this.closeMenu();
    }

    private closeMenu() {
        this.menu.classList.toggle("open", false);
        window.removeEventListener("mousedown", this.onOutsideMouseDown);
    }

    private onClickPlus = (e: MouseEvent) => {
        this.prepareMenuUnder(this.plus);

        if (this.menu.children.length !== 3) {
            while (this.menu.children.length > 1) {
                this.menu.removeChild(this.menu.lastChild);
            }
            this.menu.append(this.options["create"], this.options["import"]);
        }

        this.menuTabId = undefined;
    }

    private renameWorkspace = (id: number) => {
        const tab = this.tabs.get(id);
        if ( !tab || !tab.editing) return;

        tab.endEditing();
        const newName = tab.input.value.trim().slice(0, MAX_WORKSPACE_NAME_LENGTH);
        if (newName.length === 0) {
            tab.setName(app.state.workspaces.get(id)!.name);
            return;
        }
        window.getSelection()?.removeAllRanges();

        if ( !app.state.renameWorkspace(id, newName)) {
            tab.setName(app.state.workspaces.get(id)!.name);
            return;
        }
    }

    private onClickRename = (e: MouseEvent) => {
        if (this.menuTabId === undefined) return;
        const tab = this.tabs.get(this.menuTabId);
        if ( !tab) return;
        e.stopPropagation();

        tab.startEditing();
        this.closeMenu();
    }

    private onClickDuplicate = (e: MouseEvent) => {
        e.stopPropagation();
        app.state.duplicateWorkspace(this.menuTabId!).catch();
    }

    private onClickExport = (e: MouseEvent) => {
        console.log("ws.onClickExport");
        e.stopPropagation();
        // todo
    }

    private onClickDelete = (e: MouseEvent) => {
        e.stopPropagation();
        if ( !window.confirm("Are you sure you want to delete this workspace? This action is irreversible.")) return;
        app.state.deleteWorkspace(this.menuTabId!).then();
        this.closeMenu();
    }

    private onClickCreate = (e: MouseEvent) => {
        e.stopPropagation();
        app.state.createWorkspace().then();
        this.closeMenu();
    }

    private onClickImport = (e: MouseEvent) => {
        console.log("ws.onClickImport");
        e.stopPropagation();
        // todo
    }
}
