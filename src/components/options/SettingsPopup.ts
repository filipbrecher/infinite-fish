import "./settings.css";
import type {IPopup} from "./IPopup";


const SECTION_NAME_LIST = ["general", "controls", "sidebar"];
type SectionName = typeof SECTION_NAME_LIST[number];
type Section = {
    nav: HTMLDivElement;
    content: HTMLDivElement;
}
type Sections = {
    [key in SectionName]: Section;
};

// todo - the option to allow Nothing to be generated -> with a disclaimer that it can break lineages containing it in infinibrowser
export class SettingsPopup implements IPopup {
    private readonly popup: HTMLDivElement;
    private readonly applyChanges: HTMLDivElement;

    private readonly sections: Sections = {};
    private activeSection: SectionName;

    constructor() {
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


    }

    public open = () => {
        this.popup.style.display = "flex";
    }

    public close = () => {
        this.popup.style.display = "none";
    }

    private onClickApplyChanges = () => {
        console.log("onClickApplyChanges");
    }

    private onClickSection = (section: SectionName) => {
        if (this.activeSection === section) return;
        console.log(`onClickSection: ${section}`);
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
}