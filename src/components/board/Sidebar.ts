import "./sidebar.css";
import type {IComponent} from "../IComponent";
import {app} from "../../main";
import {View} from "./objects/View";
import {InstanceTypeProps} from "../../types/dbSchema";
import {ElementView} from "./objects/ElementView";

// todo - use item and view for element rendering - add input captures:
//      (drag + copy element are the same capture (put in workspace), onViewCopyEmojiText, onViewInfo, elementToggleVisibility
export class Sidebar implements IComponent {
    private sidebar: HTMLDivElement;
    private resizer: HTMLDivElement;
    private sidebarItems: HTMLDivElement;

    private static readonly MIN_WIDTH: number = 15;
    private static readonly MAX_WIDTH: number = 1000;
    private width: number = 200;

    private isResizing = false;

    constructor() {
        this.sidebar = <HTMLDivElement>document.getElementById("sidebar");
        this.resizer = <HTMLDivElement>document.getElementById("resizer");
        this.sidebarItems = <HTMLDivElement>document.getElementById("sidebar-items");

        document.documentElement.style.setProperty('--sidebar-width', `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onClickResizer);

        app.state._saveUnloaded.subscribe(this.onSaveUnloaded);
        app.state._saveLoaded.subscribe(this.onSaveLoaded);
    }

    private onSaveUnloaded = () => {
        this.sidebarItems.innerHTML = "";
    }

    private onSaveLoaded = () => {
        app.state.elements.forEach((e) => {
            const view = new ElementView(e);
            const viewDiv = view.getDiv();

            // todo - add captures
            // todo - wrap in item (possibly)

            this.sidebarItems.appendChild(viewDiv);
        });
    }

    private onClickResizer = (e: MouseEvent) => {
        this.isResizing = true;

        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mouseup", this.onMouseUp);
        e.stopPropagation();
    }

    private onMouseMove = (e: MouseEvent) => {
        if ( !this.isResizing) return;

        const newWidth = window.innerWidth - e.clientX;
        this.width = Math.min(Sidebar.MAX_WIDTH, Math.max(Sidebar.MIN_WIDTH, newWidth));
        document.documentElement.style.setProperty('--sidebar-width', `${this.width}px`);
    };

    private onMouseUp = () => {
        this.isResizing = false;

        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    }
}
