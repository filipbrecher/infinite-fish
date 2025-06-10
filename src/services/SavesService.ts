import type {Save} from "../types/dbSchema";
import {app} from "../main";
import {Utils} from "./Utils";


export class SavesService {
    private _saves: Save[];

    public async init(): Promise<void> {
        this._saves = await app.databaseService.loadSaveInfo();
    }

    public getSortedSaves(): Save[] {
        return [...this._saves].sort((a, b) => {
            if (a.datetimeUpdated != b.datetimeUpdated) {
                return b.datetimeUpdated - a.datetimeUpdated;
            }
            return b.datetimeCreated - a.datetimeCreated;
        });
    }

    public saveToDiv(save: Save): HTMLDivElement {
        const div = document.createElement("div");
        div.className = "save";

        // save top
        const top = document.createElement("div");
        top.className = "save-top";

        const info = document.createElement("div");
        info.className = "save-info";

        const name = document.createElement("div");
        name.className = "save-name";
        name.textContent = save.name;

        const date = document.createElement("div");
        date.className = "save-date";
        date.textContent = Utils.getFormattedDatetime(
            save.datetimeUpdated === 0 ? save.datetimeCreated : save.datetimeUpdated
        );

        info.append(name, date);

        const actions = document.createElement("div");
        actions.className = "save-actions";
        ["Edit", "Export", "Delete"].forEach(type => {
            const buttonDiv = document.createElement("div");
            buttonDiv.className = `${type.toLowerCase()}-icon button`;
            buttonDiv.title = type;
            actions.appendChild(buttonDiv);
        });

        top.append(info, actions);

        // save stats
        const stats = document.createElement("div");
        stats.className = "save-stats";

        const createStat = (label: string, value: number) => {
            const wrapper = document.createElement("div");

            const labelDiv = document.createElement("div");
            labelDiv.className = "stat-label";
            labelDiv.textContent = label;

            const valueDiv = document.createElement("div");
            valueDiv.className = "stat-value";
            valueDiv.textContent = value.toString();

            wrapper.append(labelDiv, valueDiv);
            return wrapper;
        };

        stats.append(
            createStat("Elements", save.elementCount),
            createStat("Discoveries", save.discoveryCount),
            createStat("Recipes", save.recipeCount),
        );

        div.append(top, stats);

        return div;
    }
}
