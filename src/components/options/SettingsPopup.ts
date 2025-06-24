import "./settings.css";
import type {IPopup} from "./IPopup";
import type {SettingsProps, Theme} from "../../types/db/schema";
import {app} from "../../main";
import {THEME_STYLES} from "../../constants/settings";


const SECTION_NAME_LIST = ["general", "controls", "sidebar"];
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

// todo - make a neew object for themes -> they import themes + define colors for settings
export class SettingsPopup implements IPopup {
    private readonly overlay: HTMLDivElement;
    private readonly popup: HTMLDivElement;
    private readonly applyChanges: HTMLDivElement;

    private readonly INITS: {[key in SectionName]: () => void} = {
        general: this.initGeneral.bind(this),
        controls: this.initControls.bind(this),
        sidebar: this.initSidebar.bind(this),
    };

    private readonly sections: Sections = {} as Sections;
    private activeSection: SectionName;

    private changes: Partial<SettingsProps>;

    constructor() {
        this.overlay = document.getElementById("options-overlay") as HTMLDivElement;
        this.popup = document.getElementById("settings-popup") as HTMLDivElement;
        this.applyChanges = document.getElementById("settings-apply-changes") as HTMLDivElement;
        this.applyChanges.addEventListener("click", this.onClickApplyChanges);

        this.sections = {} as Sections;
        for (let sectionName of SECTION_NAME_LIST) {
            this.sections[sectionName] = {} as Section;
            const section: Section = this.sections[sectionName];
            section.nav = document.getElementById(`settings-navigation-${sectionName}`) as HTMLDivElement;
            section.content = document.getElementById(`settings-content-${sectionName}`) as HTMLDivElement;
            section.nav.addEventListener("click", () => { this.onClickSection(sectionName); });
        }
        console.log(this.sections);
    }

    private initGeneral() {
        console.log("initGeneral");
        const content = this.sections.general.content;
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

        const section = this.sections.general;

        section.themeName = content.querySelector("#settings-content-general-theme-name") as HTMLDivElement;
        section.themeToggle = content.querySelector("#settings-content-general-theme-toggle") as HTMLDivElement;
        section.nothingToggle = content.querySelector("#settings-content-general-nothing-toggle") as HTMLDivElement;

        const theme = THEME_STYLES[app.settings.settings.theme];
        section.themeName.innerText = theme.name;
        section.themeToggle.style.backgroundColor = theme.background;
        section.themeToggle.style.border = `1px solid ${theme.border}`;
        section.nothingToggle.classList.toggle("toggle-on", app.settings.settings.allowCombineToNothing);

        section.themeToggle.addEventListener("click", this.onGeneralToggleTheme);
        section.nothingToggle.addEventListener("click", this.onGeneralToggleNothing);
    }

    private initControls() {
        console.log("initControls", this.sections.controls);
    }

    private initSidebar() {
        console.log("initSidebar", this.sections.sidebar);
    }

    public open = () => {
        for (let sectionName of SECTION_NAME_LIST) {
            this.INITS[sectionName]();
        }
        this.popup.style.display = "flex";
        this.changes = {};
    }

    public close = () => {
        for (let sectionName of SECTION_NAME_LIST) {
            this.sections[sectionName].content.innerHTML = "";
        }
        this.popup.style.display = "none";
    }

    private onClickApplyChanges = () => {
        if (Object.keys(this.changes).length === 0) return; // no changes
        app.settings.updateSettings(this.changes);
        this.overlay.click();
    }

    private onClickSection = (section: SectionName) => {
        if (this.activeSection === section) return;

        if (this.activeSection) {
            const prev = this.sections[this.activeSection];
            prev.nav.classList.remove("active");
            prev.content.style.display = "none";
        }

        this.activeSection = section;
        const curr = this.sections[section];
        curr.nav.classList.add("active");
        curr.content.style.display = "flex";
    }

    private getSettingsProperty<T>(keys: string[]): T {
        let ptr: any = this.changes;

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
        let ptr = this.changes;

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
        let ptr = this.changes;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if ( !ptr.hasOwnProperty(key)) ptr[key] = {};
            ptr = ptr[key];
        }
        ptr[keys[keys.length - 1]] = newValue;
    }

    private onGeneralToggleTheme = () => {
        const prev = this.getSettingsProperty<Theme>(["theme"]);
        let next: Theme;
        switch (prev) {
            case "light": next = "dark"; break;
            default: next = "light";
        }
        this.changeSettingsProperty<Theme>(["theme"], next);

        const theme = THEME_STYLES[next];

        const section = this.sections.general;
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

        this.sections.general.nothingToggle.classList.toggle("toggle-on", !prev);
    }

    // todo - functions for each button / toggle whatever
}