import "./style.css";
import {RenderUtils} from "./utils/RenderUtils";
import { Sidebar } from  "./sidebar/Sidebar.ts";

class Main {
    public static main() {
        console.log("Loaded");
        RenderUtils.setup();
        Sidebar.setup();
    }
}

Main.main();
