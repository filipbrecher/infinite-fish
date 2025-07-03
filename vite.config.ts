import { defineConfig } from 'vite';
import {copyPublicFiles} from "./vite/plugins/copyPublicFiles";


export default defineConfig((config) => {
    return {
        plugins: [
            copyPublicFiles(["audio", "images"])
        ],
        build: {
            copyPublicDir: false,
        }
    }
});
