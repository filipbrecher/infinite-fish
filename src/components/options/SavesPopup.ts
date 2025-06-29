import "./saves.css";
import type {SaveProps} from "../../types/db/schema";
import {app} from "../../main";
import {MAX_SAVE_NAME_LENGTH} from "../../constants/save";
import {Utils} from "../../services/Utils";
import {Popup} from "../popups/Popup";


export class SavesPopup extends Popup<void> {
    private readonly _importButton: HTMLDivElement;
    private readonly _createButton: HTMLDivElement;
    private readonly _savesList: HTMLDivElement;

    constructor() {
        super();
        this._popup = document.getElementById("saves-popup") as HTMLDivElement;
        this._importButton = document.getElementById("saves-import") as HTMLDivElement;
        this._createButton = document.getElementById("saves-create") as HTMLDivElement;
        this._savesList = document.getElementById("saves-list") as HTMLDivElement;

        this._importButton.addEventListener("click", this.onClickImportButton);
        this._createButton.addEventListener("click", this.onClickCreateButton);
    }

    public open = () => {
        this._savesList.innerHTML = "";
        this.getSortedSaves().forEach((save) => {
            this.prependSave(save);
        });

        this.popup.style.display = "flex";
    }

    public close = () => {
        this._savesList.innerHTML = "";

        this.popup.style.display = "none";
    }

    private onClickImportButton = () => {
        console.log("onClickImportButton");
        // todo
    }

    private onClickCreateButton = async (event) => {
        const newSave = await app.state.createNewSave();
        this.prependSave(newSave);
    }

    public getSortedSaves(): SaveProps[] {
        return [...app.state.saves.values()].sort((a, b) => {
            return a.datetimeActive - b.datetimeActive;
        });
    }

    public prependSave(save: SaveProps): void {
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
                        ${Utils.getFormattedDatetime(save.datetimeActive)}
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

        const isActive = app.state.activeSave?.id === save.id;
        if (isActive) wrapper.classList.add("active");

        const nameSpan = wrapper.querySelector(".name-display") as HTMLSpanElement;
        const nameInput = wrapper.querySelector(".name-input") as HTMLInputElement;
        const editIcon = wrapper.querySelector(".name-action-icon") as HTMLDivElement;
        const loadIcon = wrapper.querySelector(".load-icon") as HTMLDivElement;
        const deleteIcon = wrapper.querySelector(".delete-icon") as HTMLDivElement;

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

        this._savesList.prepend(wrapper);
    }

    private onClickLoadButton = (event) => {
        const id = Number(event.target.parentElement.id.slice(13));
        app.popup.close(this);
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
