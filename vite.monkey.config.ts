import { defineConfig } from 'vite'
import Userscript from 'vite-userscript-plugin'
import { name, version } from './package.json'
import path from 'path';

export default defineConfig((config) => {
    return {
        plugins: [
            Userscript({
                entry: 'src/main.ts',
                header: {
                    name: name,
                    namespace: 'alfofish',
                    version: version,
                    description: 'Infinite Fish script',
                    match: ['https://neal.fun/infinite-craft/*'],
                    'run-at': 'document-start',
                    grant: ['GM_addStyle'],
                    author: "AlfoFish",
                },
            }),
        ],
        build: {
            rollupOptions: {
                input: path.resolve(__dirname, 'index.html'),
            },
            outDir: 'dist',
        },
    }
});
