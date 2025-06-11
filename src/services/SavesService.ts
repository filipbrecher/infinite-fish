import type {Save} from "../types/dbSchema";
import {app} from "../main";
import {Utils} from "./Utils";
import {MAX_SAVE_NAME_LENGTH} from "../constants/defaults";


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
        const wrapper = document.createElement("div");
        wrapper.className = "save";
        wrapper.innerHTML = `
            <div class="save-top">
                <div class="save-info">
                    <div class="save-name">
                        <span class="name-display"></span>
                        <input class="name-input" type="text" style="display: none" placeholder="Input name" maxlength="${MAX_SAVE_NAME_LENGTH}" />
                    </div>
                    <div class="save-date">
                        ${Utils.getFormattedDatetime(save.datetimeUpdated === 0 ? save.datetimeCreated : save.datetimeUpdated)}
                    </div>
                </div>
                <div class="save-actions">
                    <div class="name-action-icon edit-icon clickable-icon" title="Edit Name"></div>
                    <div class="play-icon clickable-icon" title="Play"></div>
                    <div class="export-icon clickable-icon" title="Export"></div>
                    <div class="delete-icon clickable-icon" title="Delete"></div>
                </div>
            </div>
            <div class="save-stats">
                <div><div class="stat-label">Elements</div><div class="stat-value">${save.elementCount}</div></div>
                <div><div class="stat-label">Discoveries</div><div class="stat-value">${save.discoveryCount}</div></div>
                <div><div class="stat-label">Recipes</div><div class="stat-value">${save.recipeCount}</div></div>
            </div>
        `;

        const nameSpan = <HTMLSpanElement>wrapper.querySelector(".name-display");
        const nameInput = <HTMLInputElement>wrapper.querySelector(".name-input");
        const editIcon = <HTMLDivElement>wrapper.querySelector(".name-action-icon");

        nameSpan.textContent = save.name;

        editIcon.addEventListener("click", () => {
            if (nameInput.style.display === "none") {
                nameInput.value = nameSpan.textContent || "";
                nameSpan.style.display = "none";
                nameInput.style.display = "inline";
                nameInput.focus();
                editIcon.classList.remove("edit-icon");
                editIcon.classList.add("save-icon");
                editIcon.title = "Save Name";

            } else {
                const newName = nameInput.value.trim().slice(0, MAX_SAVE_NAME_LENGTH);
                if (newName.length > 0 && newName != save.name) {
                    nameSpan.textContent = newName;
                    save.name = newName;
                    app.databaseService.renameSave(save.id, newName).catch();
                }
                nameSpan.style.display = "inline";
                nameInput.style.display = "none";
                editIcon.classList.remove("save-icon");
                editIcon.classList.add("edit-icon");
                editIcon.title = "Edit Name";
            }
        });

        return wrapper;
    }
}
