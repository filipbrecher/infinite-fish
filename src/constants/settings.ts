import {Theme} from "../types/db/schema";

export const THEME_STYLES: Record<Theme, { name: string; background: string; border: string }> = {
    light: {
        name: "Light",
        background: "white",
        border: "black",
    },
    dark: {
        name: "Dark",
        background: "#1c1c1c",
        border: "#2c2c2c",
    },
};
