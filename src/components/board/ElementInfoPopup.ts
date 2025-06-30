import "./elementInfoPopup.css";
import {Popup} from "../popups/Popup";
import {app} from "../../main";
import {ItemWrapper} from "./wrappers/ItemWrapper";
import {ViewTypeProps} from "../../types/db/schema";


export class ElementInfoPopup extends Popup<number> {
    private readonly _title: HTMLDivElement;
    private readonly _recipes: HTMLDivElement;

    constructor() {
        super();
        this._popup = document.getElementById("element-info-popup") as HTMLDivElement;
        this._title = document.getElementById("element-info-popup-title") as HTMLDivElement;
        this._recipes = document.getElementById("element-info-popup-recipes") as HTMLDivElement;
    }

    public open = (id: number) => {
        const item = new ItemWrapper(ViewTypeProps.Element, id);
        item.mountTo(this._title as HTMLDivElement);

        const props = app.state.elementsById[id];
        props.recipes?.forEach(([id1, id2]) => {
            const row = document.createElement("div") as HTMLDivElement;
            row.classList.add("element-info-popup-row");

            const item1 = new ItemWrapper(ViewTypeProps.Element, id1);
            const item2 = new ItemWrapper(ViewTypeProps.Element, id2);
            const plus = document.createTextNode("+");

            item1.mountTo(row);
            row.append(plus);
            item2.mountTo(row);

            this._recipes.appendChild(row);
        })

        this._popup.style.display = "flex";
    }

    public close = () => {
        this._popup.style.display = "none";
        this._title.innerHTML = "";
        this._recipes.innerHTML = "";
    }
}
