import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve('./dist');
const META_PATH = path.join(DIST_DIR, 'infinite-fish.meta.js');
const HTML_PATH = path.join(DIST_DIR, 'index.html');
const CSS_PATH = path.join(DIST_DIR, 'infinite-fish.css');
const JS_PATH = path.join(DIST_DIR, 'infinite-fish.js');
const OUTPUT_PATH = path.join(DIST_DIR, 'infinite-fish.user.js');

async function main() {
    // 1) Read meta
    const meta = await fs.promises.readFile(META_PATH, 'utf8');

    // 2) Start building output
    let out = meta + '\n\nsetTimeout(() => {\n';

    // 3) Read index.html and remove lines containing 'crossorigin'
    let html = await fs.promises.readFile(HTML_PATH, 'utf8');
    html = html
        .split('\n')
        .filter(line => !line.includes('crossorigin'))
        .join('\n')
        .replace(/`/g, '\\`')  // escape backticks for template literal

    // 4) Add document.documentElement.innerHTML line
    out += `document.documentElement.innerHTML = \`${html}\`;\n\n`;

    // 5) Read CSS and replace all url("/public/*.png") in CSS with base64 encoded images
    const css = await fs.promises.readFile(CSS_PATH, 'utf8');

    // Find all pngs in dist
    const files = await fs.promises.readdir(DIST_DIR);
    const pngFiles = files.filter(f => f.endsWith('.png'));

    let cssWithBase64 = css;
    for (const pngFile of pngFiles) {
        const imgPath = path.join(DIST_DIR, pngFile);
        const imgData = await fs.promises.readFile(imgPath);
        const base64 = imgData.toString('base64');
        const dataUrl = `url("data:image/png;base64,${base64}")`;

        // Replace url("/public/*.png") in CSS (adjust path if needed)
        const regex = new RegExp(`url\\(["']?/public/${pngFile}["']?\\)`, 'g');
        cssWithBase64 = cssWithBase64.replace(regex, dataUrl);
    }

    // Add the modified CSS with GM_addStyle
    const cssWithBase64Escaped = cssWithBase64.replace(/`/g, '\\`');
    out += `GM_addStyle(\`${cssWithBase64Escaped}\`);\n\n`;

    // 7) Append infinite-fish.js content
    let js = fs.readFileSync(JS_PATH, 'utf-8');
    out += js + '\n\n';

    // 8) Close setTimeout
    out += '}, 1000);\n';

    // Write output
    await fs.promises.writeFile(OUTPUT_PATH, out, 'utf8');
    console.log('Built user script:', OUTPUT_PATH);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
