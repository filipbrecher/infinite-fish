import "./styles/style.css";
import "./styles/icons.css";
import "./styles/themes/light.css";
import "./styles/themes/dark.css";
import {App} from "./app";


const channel = new BroadcastChannel("infinite-fish");

let isMainTab = true;

channel.onmessage = (e) => {
    if (e.data === "check-presence") {
        channel.postMessage("active-tab");
    } else if (e.data === "active-tab") {
        isMainTab = false;
    }
};

channel.postMessage("check-presence");

setTimeout(() => {
    if ( !isMainTab) {
        alert("Another tab is already running this app. Please close other tabs to avoid losing data in your saves.");
        window.close();
    }
}, 500);


export const app = new App();

async function main() {
    await app.init();
}
main().catch();
