import "./settings.css";
import type {MouseProps, SettingsProps, Theme, WheelProps} from "../../types/db/schema";
import {ButtonProps, KeyProps, KeyState} from "../../types/db/schema";
import {app} from "../../main";
import {
    SECTION_NAME_LIST,
    SETTINGS_BUTTONS_LIST,
    SETTINGS_CONTROLS_LIST,
    SETTINGS_KEYS_LIST,
    THEMES_LIST
} from "../../constants/settings";
import {Popup} from "../popups/Popup";


type SectionName = typeof SECTION_NAME_LIST[number];
type Section = {
    nav: HTMLDivElement;
    content: HTMLDivElement;
}
type Sections = {
    general: Section & {
        themeName: HTMLDivElement,
        themeToggle: HTMLDivElement,
        nothingToggle: HTMLDivElement,
    },
    controls: Section,
    sidebar: Section,
};

// todo - make nicer? possibly in the future import the settings' structure from a json (text file that would define the structure)
// todo - make a new object for themes ??? -> they import themes + define colors for settings -> so that a single theme is in a single file
export class SettingsPopup extends Popup<void> {
    private readonly _applyChanges: HTMLDivElement;

    private readonly _INITS: {[key in SectionName]: () => void} = {
        general: this.initGeneral.bind(this),
        controls: this.initControls.bind(this),
        sidebar: this.initSidebar.bind(this),
    };

    private readonly _sections: Sections = {} as Sections;
    private _activeSection: SectionName;

    private _changes: Partial<SettingsProps>;

    constructor() {
        super();
        this._popup = document.getElementById("settings-popup") as HTMLDivElement;
        this._applyChanges = document.getElementById("settings-apply-changes") as HTMLDivElement;
        this._applyChanges.addEventListener("click", this.onClickApplyChanges);

        this._sections = {} as Sections;
        for (let sectionName of SECTION_NAME_LIST) {
            this._sections[sectionName] = {} as Section;
            const section: Section = this._sections[sectionName];
            section.nav = document.getElementById(`settings-navigation-${sectionName}`) as HTMLDivElement;
            section.content = document.getElementById(`settings-content-${sectionName}`) as HTMLDivElement;
            section.nav.addEventListener("click", () => { this.onClickSection(sectionName); });
        }
    }

    private initGeneral() {
        const content = this._sections.general.content;
        content.innerHTML = `
            <div class="settings-row">
                <div class="settings-row-title">Theme</div>
                <div id="settings-content-general-theme-wrapper">
                    <div id="settings-content-general-theme-name"></div>
                    <div id="settings-content-general-theme-toggle"></div>
                </div>
            </div>
            <div class="settings-row">
                <div class="settings-row-title">Allow <b>Nothing</b> Element</div>
                <div id="settings-content-general-nothing-toggle" class="yes-no-toggle"></div>
            </div>
        `;

        const section = this._sections.general;

        section.themeName = content.querySelector("#settings-content-general-theme-name") as HTMLDivElement;
        section.themeToggle = content.querySelector("#settings-content-general-theme-toggle") as HTMLDivElement;
        section.nothingToggle = content.querySelector("#settings-content-general-nothing-toggle") as HTMLDivElement;

        const theme = THEMES_LIST[app.settings.settings.theme];
        section.themeName.innerText = theme.name;
        section.themeToggle.style.backgroundColor = theme.background;
        section.themeToggle.style.border = `1px solid ${theme.border}`;
        section.nothingToggle.classList.toggle("toggle-yes", app.settings.settings.allowCombineToNothing);

        section.themeToggle.addEventListener("click", this.onGeneralToggleTheme);
        section.nothingToggle.addEventListener("click", this.onGeneralToggleNothing);
    }

    private initControls() {
        const content = this._sections.controls.content;

        let html = "";
        SETTINGS_CONTROLS_LIST.forEach(row => {
            html += `
                <div class="settings-row">
                    <div class="settings-row-title">${row.title}</div>
                    <div class="settings-content-controls-${row.ident}" class="settings-content-controls-wrapper">
            `;

            if (row.isMouse) {
                html += `<div class="settings-content-controls-subtitle">Any of (mouse buttons)</div><div class="settings-content-controls-subwrapper"> `;
                SETTINGS_BUTTONS_LIST.forEach(button => {
                    html += `
                        <div class="settings-content-controls-vertical-wrapper">
                            <div class="settings-content-controls-button-title">${button.title}</div>
                            <div id="settings-content-controls-button-${row.ident}-${button.title.toLowerCase()}" class="yes-no-toggle small-toggle"></div>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `<div class="settings-content-controls-subtitle">All of (keys)</div><div class="settings-content-controls-subwrapper">`;
            SETTINGS_KEYS_LIST.forEach(key => {
                html += `
                    <div class="settings-content-controls-vertical-wrapper">
                        <div class="settings-content-controls-key-title">${key.title}</div>
                        <div id="settings-content-controls-key-${row.ident}-${key.title.toLowerCase()}" class="yes-no-any-toggle small-toggle"></div>
                    </div>
                `;
            });
            html += `</div>`;

            html += `</div></div>`;
        });
        content.innerHTML = html;

        SETTINGS_CONTROLS_LIST.forEach(row => {
            const rowSettings = app.settings.settings[row.settingsKey] as WheelProps | MouseProps;
            if (row.isMouse) {
                SETTINGS_BUTTONS_LIST.forEach(button => {
                    const div = content.querySelector(`#settings-content-controls-button-${row.ident}-${button.title.toLowerCase()}`) as HTMLDivElement;
                    const buttons = (rowSettings as MouseProps).buttons;
                    div.classList.toggle("toggle-yes", (buttons & button.props) !== 0);

                    div.addEventListener("click", () => {
                        this.onControlsToggleButton(row.settingsKey, button.props, div);
                    });
                });
            }

            SETTINGS_KEYS_LIST.forEach(key => {
                const div = content.querySelector(`#settings-content-controls-key-${row.ident}-${key.title.toLowerCase()}`) as HTMLDivElement;
                const keys = row.isMouse ? (rowSettings as MouseProps).keys : (rowSettings as WheelProps);
                div.classList.toggle("toggle-yes", keys[key.props] === KeyState.YES);
                div.classList.toggle("toggle-no", keys[key.props] === KeyState.NO);

                div.addEventListener("click", () => {
                    this.onControlsToggleKey(row.settingsKey, key.props, row.isMouse, div);
                });
            });
        });
    }

    private initSidebar() {
        const content = this._sections.sidebar.content;
        content.innerHTML = `
            <div class="settings-row">
                <div class="settings-row-title">Items In Sidebar Limit</div>
                <input id="settings-content-sidebar-result-limit" class="underlined-input" type="text" placeholder="..." maxlength="10" autocomplete="off" spellcheck="false" />
            </div>
            <div class="settings-row">
                <div class="settings-row-title">Sidebar Debounce (in ms)</div>
                <input id="settings-content-sidebar-debounce" class="underlined-input" type="text" placeholder="..." maxlength="10" autocomplete="off" spellcheck="false" />
            </div>
            <div class="settings-row">
                <div class="settings-row-title">Show Unicode Input</div>
                <div id="settings-content-sidebar-unicode-input" class="yes-no-toggle"></div>
            </div>
            <div class="settings-row">
                <div class="settings-row-title">Show Hidden Elements Toggle</div>
                <div id="settings-content-general-hidden" class="yes-no-toggle"></div>
            </div>
            <div class="settings-row">
                <div class="settings-row-title">Show Discovered Elements Toggle</div>
                <div id="settings-content-general-discovery" class="yes-no-toggle"></div>
            </div>
            <div class="settings-row">
                <div class="settings-row-title">Show Reversed Order Toggle</div>
                <div id="settings-content-general-reversed" class="yes-no-toggle"></div>
            </div>
        `;

        const resultLimit = content.querySelector("#settings-content-sidebar-result-limit") as HTMLInputElement;
        const debounce = content.querySelector("#settings-content-sidebar-debounce") as HTMLInputElement;
        const unicodeInput = content.querySelector("#settings-content-sidebar-unicode-input") as HTMLDivElement;
        const hidden = content.querySelector("#settings-content-general-hidden") as HTMLDivElement;
        const discovery = content.querySelector("#settings-content-general-discovery") as HTMLDivElement;
        const reversed = content.querySelector("#settings-content-general-reversed") as HTMLDivElement;

        resultLimit.value = app.settings.settings.searchResultLimit.toString();
        debounce.value = app.settings.settings.searchResultDebounce .toString();
        unicodeInput.classList.toggle("toggle-yes", app.settings.settings.searchShowUnicodeInput);
        hidden.classList.toggle("toggle-yes", app.settings.settings.searchShowHiddenToggle);
        discovery.classList.toggle("toggle-yes", app.settings.settings.searchShowDiscoveryToggle);
        reversed.classList.toggle("toggle-yes", app.settings.settings.searchShowReverseToggle);

        resultLimit.addEventListener("input", (e: InputEvent) => {
            this.onNaturalNumberInput(e, "searchResultLimit");
        })
        debounce.addEventListener("input", (e: InputEvent) => {
            this.onNaturalNumberInput(e, "searchResultDebounce");
        })
        unicodeInput.addEventListener("click", () => {
            this.onToggleBoolean("searchShowUnicodeInput", unicodeInput);
        });
        hidden.addEventListener("click", () => {
            this.onToggleBoolean("searchShowHiddenToggle", hidden);
        });
        discovery.addEventListener("click", () => {
            this.onToggleBoolean("searchShowDiscoveryToggle", discovery);
        });
        reversed.addEventListener("click", () => {
            this.onToggleBoolean("searchShowReverseToggle", reversed);
        });
    }

    public open = () => {
        for (let sectionName of SECTION_NAME_LIST) {
            this._INITS[sectionName]();
        }
        this.popup.style.display = "flex";
        this._changes = {};
    }

    public close = () => {
        for (let sectionName of SECTION_NAME_LIST) {
            this._sections[sectionName].content.innerHTML = "";
        }
        this.popup.style.display = "none";
    }

    private onClickApplyChanges = () => {
        if (Object.keys(this._changes).length === 0) return; // no changes
        app.settings.updateSettings(this._changes);
        app.popup.close(this);
    }

    private onClickSection = (section: SectionName) => {
        if (this._activeSection === section) return;

        if (this._activeSection) {
            const prev = this._sections[this._activeSection];
            prev.nav.classList.remove("active");
            prev.content.style.display = "none";
        }

        this._activeSection = section;
        const curr = this._sections[section];
        curr.nav.classList.add("active");
        curr.content.style.display = "flex";
    }

    private getSettingsProperty<T>(keys: string[]): T {
        let ptr: any = this._changes;

        for (const key of keys) {
            if (ptr && ptr.hasOwnProperty(key)) {
                ptr = ptr[key];
            } else {
                // fallback to default settings
                ptr = app.settings.settings;
                for (const k of keys) {
                    ptr = ptr[k];
                }
                break;
            }
        }

        return ptr;
    }

    private deleteNestedPropertiesWhileEmpty(keys: string[]): void {
        const stack: [any, string][] = [];
        let ptr = this._changes;

        for (const key of keys) {
            if ( !ptr.hasOwnProperty(key)) return; // nothing to delete
            stack.push([ptr, key]);
            ptr = ptr[key];
        }

        // delete bottom-up while the object is empty
        for (let i = stack.length - 1; i >= 0; i--) {
            const [parent, key] = stack[i];
            delete parent[key];
            if (Object.keys(parent).length > 0) break;
        }
    }

    private changeSettingsProperty<T>(keys: string[], newValue: T): void {
        // get original value
        let original: any = app.settings.settings;
        for (const key of keys) {
            original = original[key];
        }

        // if same as original, we remove it from this.changes
        if (JSON.stringify(original) === JSON.stringify(newValue)) {
            this.deleteNestedPropertiesWhileEmpty(keys);
            return;
        }

        // set nested value in this.changes
        let ptr = this._changes;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if ( !ptr.hasOwnProperty(key)) ptr[key] = {};
            ptr = ptr[key];
        }
        ptr[keys[keys.length - 1]] = newValue;
    }

    /* common */

    private onToggleBoolean = (settingsKey: string, div: HTMLDivElement) => {
        const prev = this.getSettingsProperty<boolean>([settingsKey]);
        this.changeSettingsProperty<boolean>([settingsKey], !prev);
        div.classList.toggle("toggle-yes", !prev);
    }

    private onNaturalNumberInput = (e: InputEvent, settingsKey: string) => {
        const div = e.target as HTMLInputElement;
        const raw = div.value;
        let caret = div.selectionStart ?? raw.length;

        let cleaned = "";

        for (let i = 0; i < raw.length; i++) {
            const c = raw[i];
            if ("0" <= c && c <= "9") {
                cleaned += c;
            } else if (i < caret) {
                caret--;
            }
        }
        caret = Math.min(caret, cleaned.length);

        const value = Number(cleaned);
        this.changeSettingsProperty<number>([settingsKey], value);
        div.value = cleaned === "" ? "" : value.toString();
        div.setSelectionRange(caret, caret);
    }

    /* general */

    private onGeneralToggleTheme = () => {
        const prev = this.getSettingsProperty<Theme>(["theme"]);
        let next: Theme;
        switch (prev) {
            case "light": next = "dark"; break;
            default: next = "light";
        }
        this.changeSettingsProperty<Theme>(["theme"], next);

        const theme = THEMES_LIST[next];

        const section = this._sections.general;
        section.themeName.innerText = theme.name;
        section.themeToggle.style.backgroundColor = theme.background;
        section.themeToggle.style.border = `1px solid ${theme.border}`;
    }

    private onGeneralToggleNothing = () => {
        const prev = this.getSettingsProperty<boolean>(["allowCombineToNothing"]);
        if ( !prev) {
            const confirmed = window.confirm(
                "Are you sure you want to allow the Nothing element? " +
                "If you ever use it in a recipe, then on Infinibrowser that recipe becomes invalid, " +
                "and it will break all lineages that require it !!! " +
                "Proceed only if you understand the risks."
            );
            if ( !confirmed) return;
        }
        
        this.changeSettingsProperty<boolean>(["allowCombineToNothing"], !prev);

        this._sections.general.nothingToggle.classList.toggle("toggle-yes", !prev);
    }

    /* controls */

    private onControlsToggleButton = (settingsKey: string, button: ButtonProps, div: HTMLDivElement) => {
        const prev = this.getSettingsProperty<number>([settingsKey, "buttons"]);
        const next = prev ^ button;
        this.changeSettingsProperty<number>([settingsKey, "buttons"], next);
        div.classList.toggle("toggle-yes", (next & button) !== 0);
    }

    private onControlsToggleKey = (settingsKey: string, keyKey: KeyProps, isMouse: boolean, div: HTMLDivElement) => {
        const keys = isMouse ? [settingsKey, "keys", keyKey] : [settingsKey, keyKey];
        const prev = this.getSettingsProperty<KeyState>(keys);
        let next: KeyState;
        switch (prev) {
            case KeyState.YES: next = KeyState.NO; break;
            case KeyState.NO: next = KeyState.ANY; break;
            default: next = KeyState.YES;
        }
        this.changeSettingsProperty<KeyState>(keys, next);
        div.classList.toggle("toggle-yes", next === KeyState.YES);
        div.classList.toggle("toggle-no", next === KeyState.NO);
    }

    /* sidebar - nothing extra */

}