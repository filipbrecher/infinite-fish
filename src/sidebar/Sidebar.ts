
export class Sidebar {
    private static sidebar: HTMLDivElement;
    private static resizer: HTMLDivElement;

    private static width: number = 200;
    private static readonly MAX_WIDTH: number = 1000;
    private static readonly MIN_WIDTH: number = 10;

    private static isResizing = false;

    public static setup() {
        this.sidebar = <HTMLDivElement>document.getElementById("sidebar");
        this.resizer = <HTMLDivElement>document.getElementById("resizer");

        this.sidebar.style.setProperty("width", `${this.width}px`);
        this.resizer.addEventListener("mousedown", this.onClickResizer);
    }

    private static onClickResizer = (e: MouseEvent) => {
        this.isResizing = true;

        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mouseup", this.onMouseUp);
        e.stopPropagation();
    }

    private static onMouseMove = (e: MouseEvent) => {
        if ( !this.isResizing) return;

        const newWidth = window.innerWidth - e.clientX;
        this.width = Math.min(this.MAX_WIDTH, Math.max(this.MIN_WIDTH, newWidth));
        this.sidebar.style.setProperty("width", `${this.width}px`);
    };

    private static onMouseUp = (e: MouseEvent) => {
        this.isResizing = false;

        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    }
}
