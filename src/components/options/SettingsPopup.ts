import "./settings.css";
import type {SettingsProps} from "../../types/db/schema";
import {ViewTypeProps} from "../../types/db/schema";
import type {
    MouseProps,
    SettingsContentConfirmToggle, SettingsContentMap,
    SettingsContentMouseToggles, SettingsContentNaturalInput,
    SettingsContentThemeToggle,
    SettingsContentWheelToggles, SettingsContentYesNoToggle,
    SettingsSection,
    SettingsSectionKey,
    SettingsSectionRow,
    Theme,
    WheelProps
} from "../../constants/settings";
import {
    ButtonProps,
    KeyProps,
    KeyState,
    SECTION_KEY_LIST,
    SETTINGS_CONFIG
} from "../../constants/settings";
import {app} from "../../main";
import {
    SETTINGS_BUTTONS_LIST,
    SETTINGS_KEYS_LIST,
    THEMES_LIST
} from "../../constants/settings";
import {Popup} from "../popups/Popup";
import {ItemWrapper} from "../board/wrappers/ItemWrapper";
import {Wrapper} from "../board/wrappers/Wrapper";


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

export class SettingsPopup extends Popup<void> {
    private readonly _navigation: HTMLDivElement;
    private readonly _sectionsWrapper: HTMLDivElement;
    private readonly _applyChanges: HTMLDivElement;

    private readonly _sections: Sections = {} as Sections;
    private _activeSection: SettingsSectionKey;

    private _changes: Partial<SettingsProps>;

    private readonly CONTENT_GETTER: {[K in keyof SettingsContentMap]: (sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentMap[K]) => HTMLElement} = {
        themeToggle: this.getThemeToggle.bind(this),
        naturalInput: this.getNaturalInput.bind(this),
        yesNoToggle: this.getYesNoToggle.bind(this),
        yesNoConfirmToggle: this.getYesNoConfirmToggle.bind(this),
        wheelToggles: this.getWheelToggles.bind(this),
        mouseToggles: this.getMouseToggles.bind(this),
    };

    constructor() {
        super();
        this._popup = document.getElementById("settings-popup") as HTMLDivElement;

        this._navigation = document.getElementById("settings-navigation") as HTMLDivElement;
        this._sectionsWrapper = document.getElementById("settings-sections-wrapper") as HTMLDivElement;
        this._applyChanges = document.getElementById("settings-apply-changes") as HTMLDivElement;
        this._applyChanges.addEventListener("click", this.onClickApplyChanges);

        this._activeSection = SECTION_KEY_LIST[0];
    }

    public static getNothingToggleTitle(): HTMLDivElement {
        const wrapper = document.createElement("div");
        wrapper.classList.add("settings-row-title-outermost");
        wrapper.classList.add("settings-row-label");
        wrapper.classList.add("settings-content-general-nothing-title");
        wrapper.innerText = "Allow";

        let item: Wrapper;
        const e = app.state.elementsByText.get("Nothing");
        if (e) {
            item = new ItemWrapper(ViewTypeProps.Element, e.id);
        } else {
            item = new ItemWrapper(ViewTypeProps.GhostElement, {emoji: "", text: "Nothing"});
        }
        item.setDisabled(true);
        item.mountTo(wrapper);
        const elemText = document.createTextNode("Element");
        wrapper.appendChild(elemText);
        return wrapper;
    }

    private getThemeToggle(sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentThemeToggle): HTMLDivElement {
        const theme = THEMES_LIST[app.settings.settings.general.theme];

        const name = document.createElement("div");
        name.classList.add("settings-content-theme-name");
        name.innerText = theme.name;
        const toggle = document.createElement("div");

        toggle.classList.add("settings-content-theme-toggle");
        toggle.style.backgroundColor = theme.background;
        toggle.style.border = `1px solid ${theme.border}`;
        toggle.addEventListener("click", () => {
            this.onToggleTheme([sectionKey, rowKey], name, toggle);
        });

        const div = document.createElement("div");
        div.classList.add("settings-content-theme-wrapper");
        div.append(name, toggle);

        return div;
    }

    private getNaturalInput(sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentNaturalInput): HTMLInputElement {
        const input = document.createElement("input");
        input.classList.add("underlined-input");
        input.type = "text";
        input.placeholder = "...";
        input.maxLength = 10;
        input.autocomplete = "off";
        input.spellcheck = false;
        input.value = app.settings.settings[sectionKey][rowKey].toString();
        input.addEventListener("input", (e: InputEvent) => {
            this.onNaturalInput(e, [sectionKey, rowKey], content.min, content.max);
        });
        return input;
    }

    private getYesNoToggle(sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentYesNoToggle): HTMLDivElement {
        const div = document.createElement("div");
        div.classList.add("yes-no-toggle");
        div.classList.toggle("toggle-yes", app.settings.settings[sectionKey][rowKey]);
        div.addEventListener("click", () => {
            this.onToggleBoolean([sectionKey, rowKey], div);
        })
        return div;
    }

    private getYesNoConfirmToggle(sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentConfirmToggle): HTMLDivElement {
        const div = document.createElement("div");
        div.classList.add("yes-no-toggle");
        div.classList.toggle("toggle-yes", app.settings.settings[sectionKey][rowKey]);
        div.addEventListener("click", () => {
            this.onToggleBooleanConfirm([sectionKey, rowKey], div, content.beforeYesMessage, content.beforeNoMessage);
        })
        return div;
    }

    private getWheelToggles(sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentWheelToggles): HTMLDivElement {
        const wrapper = document.createElement("div");
        wrapper.classList.add("settings-content-controls-wrapper");

        const subtitle = document.createElement("div");
        subtitle.classList.add("settings-content-controls-subtitle");
        subtitle.innerText = "All of (keys)";

        const subwrapper = document.createElement("div");
        subwrapper.classList.add("settings-content-controls-subwrapper");

        const keyboardKeys = app.settings.settings[sectionKey][rowKey] as WheelProps;
        SETTINGS_KEYS_LIST.forEach(key => {
            const verticalWrapper = document.createElement("div");
            verticalWrapper.classList.add("settings-content-controls-vertical-wrapper");

            const title = document.createElement("div");
            title.classList.add("settings-content-controls-key-title");
            title.innerText = key.title;

            const toggle = document.createElement("div");
            toggle.classList.add("yes-no-any-toggle");
            toggle.classList.add("small-toggle");
            toggle.classList.toggle("toggle-yes", keyboardKeys[key.props] === KeyState.YES);
            toggle.classList.toggle("toggle-no", keyboardKeys[key.props] === KeyState.NO);
            toggle.addEventListener("click", () => {
                this.onControlsToggleKey([sectionKey, rowKey, key.props], toggle);
            });

            verticalWrapper.append(title, toggle);
            subwrapper.appendChild(verticalWrapper);
        });

        wrapper.append(subtitle, subwrapper);
        return wrapper;
    }

    private getMouseToggles(sectionKey: SettingsSectionKey, rowKey: string, content: SettingsContentMouseToggles): HTMLDivElement {
        const wrapper = document.createElement("div");
        wrapper.classList.add("settings-content-controls-wrapper");

        const props = app.settings.settings[sectionKey][rowKey] as MouseProps;

        const subtitle1 = document.createElement("div");
        subtitle1.classList.add("settings-content-controls-subtitle");
        subtitle1.innerText = "Any of (mouse buttons)";

        const subwrapper1 = document.createElement("div");
        subwrapper1.classList.add("settings-content-controls-subwrapper");

        const subtitle2 = document.createElement("div");
        subtitle2.classList.add("settings-content-controls-subtitle");
        subtitle2.innerText = "All of (keys)";

        const subwrapper2 = document.createElement("div");
        subwrapper2.classList.add("settings-content-controls-subwrapper");

        SETTINGS_BUTTONS_LIST.forEach(button => {
            const verticalWrapper = document.createElement("div");
            verticalWrapper.classList.add("settings-content-controls-vertical-wrapper");

            const title = document.createElement("div");
            title.classList.add("settings-content-controls-button-title");
            title.innerText = button.title;

            const toggle = document.createElement("div");
            toggle.classList.add("yes-no-toggle");
            toggle.classList.add("small-toggle");
            toggle.classList.toggle("toggle-yes", (props.buttons & button.props) !== 0);
            toggle.addEventListener("click", () => {
                this.onControlsToggleButton([sectionKey, rowKey, "buttons"], button.props, toggle);
            });

            verticalWrapper.append(title, toggle);
            subwrapper1.appendChild(verticalWrapper);
        });

        SETTINGS_KEYS_LIST.forEach(key => {
            const verticalWrapper = document.createElement("div");
            verticalWrapper.classList.add("settings-content-controls-vertical-wrapper");

            const title = document.createElement("div");
            title.classList.add("settings-content-controls-key-title");
            title.innerText = key.title;

            const toggle = document.createElement("div");
            toggle.classList.add("yes-no-any-toggle");
            toggle.classList.add("small-toggle");
            toggle.classList.toggle("toggle-yes", props.keys[key.props] === KeyState.YES);
            toggle.classList.toggle("toggle-no", props.keys[key.props] === KeyState.NO);
            toggle.addEventListener("click", () => {
                this.onControlsToggleKey([sectionKey, rowKey, "keys", key.props], toggle);
            });

            verticalWrapper.append(title, toggle);
            subwrapper2.appendChild(verticalWrapper);
        });

        wrapper.append(subtitle1, subwrapper1, subtitle2, subwrapper2);
        return wrapper;
    }

    private getRowTitle(sectionKey: SettingsSectionKey, row: SettingsSectionRow): HTMLDivElement {
        if (row.getTitle !== undefined) {
            return row.getTitle(sectionKey, row.key);

        }

        let titleWrapperLike: HTMLDivElement;
        let labelWrapperLike: HTMLDivElement;

        const label = document.createElement("div") as HTMLDivElement;
        label.classList.add("settings-row-label");
        label.innerText = row.title!.label;

        if (row.title!.icon !== undefined) {
            const icon = document.createElement("div") as HTMLDivElement;
            icon.classList.add("icon");
            icon.classList.add("mask-icon");
            icon.classList.add("settings-row-icon");
            icon.style.setProperty("mask-image", `var(${row.title!.icon})`);
            icon.style.setProperty("-webkit-mask-image", `var(${row.title!.icon})`);

            labelWrapperLike = document.createElement("div") as HTMLDivElement;
            labelWrapperLike.classList.add("settings-row-label-wrapper");
            labelWrapperLike.append(icon, label);
        } else {
            labelWrapperLike = label;
        }

        if (row.title!.description !== undefined) {
            const description = document.createElement("div") as HTMLDivElement;
            description.classList.add("settings-row-description");
            description.innerText = row.title!.description;

            titleWrapperLike = document.createElement("div") as HTMLDivElement;
            titleWrapperLike.classList.add("settings-row-title-wrapper");
            titleWrapperLike.append(labelWrapperLike, description);
        } else {
            titleWrapperLike = labelWrapperLike;
        }

        titleWrapperLike.classList.add("settings-row-title-outermost");
        return titleWrapperLike;
    }

    private getRow(sectionKey: SettingsSectionKey, row: SettingsSectionRow): HTMLDivElement {
        const rowWrapper = document.createElement("div") as HTMLDivElement;
        rowWrapper.classList.add("settings-row");

        const title = this.getRowTitle(sectionKey, row) as HTMLDivElement;
        const content = this.CONTENT_GETTER[row.content.type](sectionKey, row.key, row.content) as HTMLElement;
        rowWrapper.append(title, content);

        return rowWrapper;
    }

    private appendSection(section: SettingsSection) {
        const nav = document.createElement("div") as HTMLDivElement;
        nav.classList.add("settings-navigation-item");
        nav.innerText = section.label;
        nav.addEventListener("click", () => { this.onClickSection(section.key); });
        this._navigation.appendChild(nav);

        const content = document.createElement("div") as HTMLDivElement;
        content.classList.add("settings-section");
        this._sectionsWrapper.appendChild(content);

        this._sections[section.key] = {};
        this._sections[section.key].nav = nav;
        this._sections[section.key].content = content;

        section.rows.forEach((row: SettingsSectionRow) => {
            content.appendChild(this.getRow(section.key, row));
        });
    }

    public open = () => {
        SETTINGS_CONFIG.forEach((section: SettingsSection) => {
            this.appendSection(section);
        });
        this._sections[this._activeSection].nav.classList.add("active");
        this._sections[this._activeSection].content.classList.add("active");
        this.popup.style.display = "flex";
        this._changes = {};
    }

    public close = () => {
        this._navigation.innerHTML = "";
        this._sectionsWrapper.innerHTML = "";
        this.popup.style.display = "none";
    }

    private onClickApplyChanges = () => {
        if (Object.keys(this._changes).length === 0) return; // no changes
        app.settings.updateSettings(this._changes);
        app.popup.close(this);
    }

    private onClickSection = (sectionKey: SettingsSectionKey) => {
        if (this._activeSection === sectionKey) return;

        if (this._activeSection) {
            const prev = this._sections[this._activeSection];
            prev.nav.classList.remove("active");
            prev.content.classList.remove("active");
        }

        this._activeSection = sectionKey;
        const curr = this._sections[sectionKey];
        curr.nav.classList.add("active");
        curr.content.classList.add("active");
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

    /* listeners */

    private onToggleTheme = (keys: string[], name: HTMLDivElement, toggle: HTMLDivElement) => {
        const prev = this.getSettingsProperty<Theme>(keys);
        let next: Theme;
        switch (prev) {
            case "light": next = "dark"; break;
            default: next = "light";
        }
        this.changeSettingsProperty<Theme>(keys, next);

        const theme = THEMES_LIST[next];

        name.innerText = theme.name;
        toggle.style.backgroundColor = theme.background;
        toggle.style.border = `1px solid ${theme.border}`;
    }

    private onNaturalInput = (e: InputEvent, keys: string[], min?: number, max?: number) => {
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

        let value = Number(cleaned);
        if (min !== undefined && value < min) value = min;
        if (max !== undefined && value > max) value = max;

        this.changeSettingsProperty<number>(keys, value);
        div.value = cleaned === "" ? "" : value.toString();
        div.setSelectionRange(caret, caret);
    }

    private onToggleBoolean = (keys: string[], div: HTMLDivElement) => {
        const prev = this.getSettingsProperty<boolean>(keys);
        const next = !prev;
        this.changeSettingsProperty<boolean>(keys, next);
        div.classList.toggle("toggle-yes", next);
    }

    private onToggleBooleanConfirm = (keys: string[], div: HTMLDivElement, beforeYes?: string, beforeNo?: string) => {
        const prev = this.getSettingsProperty<boolean>(keys);
        const next = !prev;
        if (next && beforeYes !== undefined) {
            if ( !window.confirm(beforeYes)) return;
        } else if ( !next && beforeNo !== undefined) {
            if ( !window.confirm(beforeNo)) return;
        }
        this.changeSettingsProperty<boolean>(keys, next);
        div.classList.toggle("toggle-yes", next);
    }

    /* controls */

    private onControlsToggleButton = (keys: string[], button: ButtonProps, div: HTMLDivElement) => {
        const prev = this.getSettingsProperty<number>(keys);
        const next = prev ^ button;
        this.changeSettingsProperty<number>(keys, next);
        div.classList.toggle("toggle-yes", (next & button) !== 0);
    }

    private onControlsToggleKey = (keys: string[], div: HTMLDivElement) => {
        console.log(keys);
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
}