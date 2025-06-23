import {View} from "../views/View";


export abstract class Wrapper {
    abstract getDiv(viewDiv: HTMLDivElement): HTMLDivElement;
    abstract getView(): View;
}
