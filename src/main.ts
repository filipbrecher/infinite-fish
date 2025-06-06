import "./style.css";
import {Sidebar} from "./sidebar/Sidebar";
import {Database} from "./storage/Database";

class Main {
    public static async main() {
        if ( !await database.connect()) {
            return;
        }
    }
}

export const database: Database = new Database();
export const sidebar: Sidebar = new Sidebar();

await Main.main();
