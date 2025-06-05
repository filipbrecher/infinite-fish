
export class RenderUtils {
    private static globalCursor: HTMLStyleElement;
    private static appliedStyle: string | null;

    public static setup() {
        this.globalCursor = <HTMLStyleElement>document.getElementById("global-cursor-style");
    }

    public static setGlobalCursor(style: string) {
        if (this.appliedStyle === null) return;
        this.appliedStyle = style;
        this.globalCursor.innerHTML = `*{ cursor: ${style} !important; }`;
    }

    public static unsetGlobalCursor(style: string) {
        if (this.appliedStyle != style) return;
        this.appliedStyle = null;
        this.globalCursor.innerHTML = "";
    }
}