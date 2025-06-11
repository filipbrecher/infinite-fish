import "./sidebar.css";
import type {IComponent} from "../IComponent";

export class Sidebar implements IComponent {
    private sidebar: HTMLDivElement;
    private resizer: HTMLDivElement;

    private static readonly MIN_WIDTH: number = 10;
    private static readonly MAX_WIDTH: number = 1000;
    private width: number = 200;

    private isResizing = false;

    constructor() {
        this.sidebar = <HTMLDivElement>document.getElementById("sidebar");
        this.resizer = <HTMLDivElement>document.getElementById("resizer");

        this.sidebar.style.setProperty("width", `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onClickResizer);
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
        this.sidebar.style.setProperty("width", `${this.width}px`);
    };

    private onMouseUp = () => {
        this.isResizing = false;

        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    }
}
