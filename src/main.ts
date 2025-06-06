import "./style.css";
import { Sidebar } from  "./sidebar/Sidebar.ts";
import { Database } from "./storage/Database";

class Main {
    public static async main() {
        Sidebar.setup();
        if ( !await Database.setup()) {
            return;
        }
    }
}

await Main.main();
