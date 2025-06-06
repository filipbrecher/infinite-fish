import "./style.css";
import { Sidebar } from  "./sidebar/Sidebar.ts";

class Main {
    public static async main() {
        Sidebar.setup();
    }
}

await Main.main();
