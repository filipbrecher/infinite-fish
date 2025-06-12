import type {Save} from "../../types/dbSchema";
import {app} from "../../main";
import {MAX_SAVE_NAME_LENGTH} from "../../constants/defaults";
import {Utils} from "../../services/Utils";
import type {IPopup} from "./IPopup";


export class SavesPopup implements IPopup {
    private readonly overlay: HTMLDivElement;
    private readonly popup: HTMLDivElement;
    private readonly importButton: HTMLDivElement;
    private readonly createButton: HTMLDivElement;
    private readonly savesList: HTMLDivElement;

    constructor() {
        this.overlay = <HTMLDivElement>document.getElementById("options-overlay");
        this.popup = <HTMLDivElement>document.getElementById("saves-popup");
        this.importButton = <HTMLDivElement>document.getElementById("saves-import");
        this.createButton = <HTMLDivElement>document.getElementById("saves-create");
        this.savesList = <HTMLDivElement>document.getElementById("saves-list");

        this.importButton.addEventListener("click", this.onClickImportButton);
        this.createButton.addEventListener("click", this.onClickCreateButton);
    }

    public open = () => {
        this.savesList.innerHTML = "";
        this.getSortedSaves().forEach((save) => {
            this.prependSave(save);
        });

        this.popup.style.display = "flex";
    }

    public close = () => {
        this.savesList.innerHTML = "";

        this.popup.style.display = "none";
    }

    private onClickImportButton = (event) => {
        console.log("clicked onMouseDownImportButton");
        // todo
    }

    private onClickCreateButton = async (event) => {
        const newSave = await app.state.createNewSave();
        this.prependSave(newSave);
    }

    public getSortedSaves(): Save[] {
        return [...app.state.saves].sort((a, b) => {
            if (a.datetimeUpdated != b.datetimeUpdated) {
                return a.datetimeUpdated - b.datetimeUpdated;
            }
            return a.datetimeCreated - b.datetimeCreated;
        });
    }

    public prependSave(save: Save): void {
        const wrapper = document.createElement("div");
        wrapper.className = "save";
        wrapper.id = `save-${save.id}`;
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
                <div id="save-actions-${save.id}" class="save-actions">
                    <div class="name-action-icon edit-icon clickable-icon" title="Edit Name"></div>
                    <div class="load-icon clickable-icon" title="Load"></div>
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

        const isActive = app.state.activeSaveId === save.id;
        if (isActive) wrapper.classList.add("active");

        const nameSpan = <HTMLSpanElement>wrapper.querySelector(".name-display");
        const nameInput = <HTMLInputElement>wrapper.querySelector(".name-input");
        const editIcon = <HTMLDivElement>wrapper.querySelector(".name-action-icon");
        const loadIcon = <HTMLDivElement>wrapper.querySelector(".load-icon");
        const deleteIcon = <HTMLDivElement>wrapper.querySelector(".delete-icon");

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
                    app.database.renameSave(save.id, newName).catch();
                }
                nameSpan.style.display = "inline";
                nameInput.style.display = "none";
                editIcon.classList.remove("save-icon");
                editIcon.classList.add("edit-icon");
                editIcon.title = "Edit Name";
            }
        });
        loadIcon.addEventListener("click", this.onClickLoadButton);
        if ( !isActive) {
            deleteIcon.addEventListener("click", this.onClickDeleteButton);
        }

        this.savesList.prepend(wrapper);
    }

    private onClickLoadButton = (event) => {
        const id = Number(event.target.parentElement.id.slice(13));
        this.overlay.click();
        app.state.loadSave(id).catch();
    }

    private onClickDeleteButton = async (event) => {
        if ( !window.confirm("Are you sure you want to delete this save? This action is irreversible.")) return;

        const id = Number(event.target.parentElement.id.slice(13));
        const saveDiv = document.getElementById(`save-${id}`);
        if ( await app.state.deleteSave(id)) {
            saveDiv.remove();
        }
    }
}
