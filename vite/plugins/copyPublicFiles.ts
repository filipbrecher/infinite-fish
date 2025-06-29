import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

function copyRecursive(srcDir: string, destDir: string) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

export function copyPublicFiles(subdirsToCopy: string[] = []): Plugin {
    return {
        name: 'copy-public-files',
        apply: 'build',
        generateBundle() {
            const publicDir = path.resolve(__dirname, '../../public');
            const outDir = path.resolve(__dirname, '../../dist');

            if (!fs.existsSync(publicDir)) return;

            // copy top-level files (non-recursive)
            for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
                if (entry.isFile()) {
                    const srcPath = path.join(publicDir, entry.name);
                    const destPath = path.join(outDir, entry.name);
                    fs.copyFileSync(srcPath, destPath);
                }
            }

            // recursively copy specified subdirectories
            for (const subdir of subdirsToCopy) {
                const srcSubDir = path.join(publicDir, subdir);
                const destSubDir = path.join(outDir, subdir);

                if (fs.existsSync(srcSubDir) && fs.statSync(srcSubDir).isDirectory()) {
                    copyRecursive(srcSubDir, destSubDir);
                }
            }
        }
    };
}