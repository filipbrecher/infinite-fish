import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve('./dist');
const META_PATH = path.join(DIST_DIR, 'infinite-fish.meta.js');
const HTML_PATH = path.join(DIST_DIR, 'index.html');
const CSS_PATH = path.join(DIST_DIR, 'infinite-fish.css');
const JS_PATH = path.join(DIST_DIR, 'infinite-fish.js');
const OUTPUT_PATH = path.join(DIST_DIR, 'infinite-fish.user.js');

// event types that need to be blocked because neal added them on window, and they stop my script for functioning properly
const EVENT_TYPES_TO_BLOCK = [
    'wheel',
    // 'scroll',
    // 'touchmove',
    // 'keydown',
    // 'keyup',
    // 'keypress',
    // 'mousedown',
    // 'mouseup',
    // 'mousemove',
    // 'mouseenter',
    // 'mouseleave',
    // 'touchstart',
    // 'touchend',
    // 'touchcancel',
    // 'pointerdown',
    // 'pointerup',
    // 'pointermove',
    // 'pointercancel',
    // 'click',
    // 'dblclick',
    // 'contextmenu',
];

const licenseComments = [
    '// This script is released under the MIT License',
    '// https://opensource.org/licenses/MIT',
    '//',
    '// Twemoji "sparkles" SVG (and its modified versions) from svgrepo.com (https://www.svgrepo.com/svg/407500/sparkles)',
    '// Originally by Twitter, licensed under the MIT License',
    '// https://github.com/twitter/twemoji/blob/master/LICENSE',
    '//',
    '// Some SVG assets from svgrepo.com are licensed under CC BY 4.0',
    '// These may include modified versions with color adjustments',
    '// https://creativecommons.org/licenses/by/4.0/',
    '//',
    '// New Notification #7 by Universfield -- https://freesound.org/s/736267/ -- License: Attribution 4.0',
    '//',
    '// Other assets are under CC0 (Public Domain)',
    '// https://creativecommons.org/publicdomain/zero/1.0/',
];

const base64Encode = fileData => fileData.toString("base64");
const TRANSFORMATIONS = [
    {
        fileType: "png",
        data: "image/png;base64",
        encode: base64Encode,
    },
    {
        fileType: "svg",
        data: "image/svg+xml",
        encode: fileData => {
            return encodeURIComponent(fileData.toString('utf8'))
                .replace(/'/g, '%27')
                .replace(/"/g, '%22');
        },
    },
    {
        fileType: "ogg",
        data: "audio/ogg;base64",
        encode: base64Encode,
    },
    {
        fileType: "mp3",
        data: "audio/mp3;base64",
        encode: base64Encode,
    },
    {
        fileType: "wav",
        data: "audio/wav;base64",
        encode: base64Encode,
    }
];

async function replaceWithEncoded(str, files) {
    for (const t of TRANSFORMATIONS) {
        const matchedFiles = files.filter(f => f.endsWith(`.${t.fileType}`));

        for (const file of matchedFiles) {
            const filePath = path.join(DIST_DIR, file);
            const fileData = await fs.promises.readFile(filePath);

            const encodedFile = t.encode(fileData);
            const replaceWith = `"data:${t.data},${encodedFile}"`;

            const regex = new RegExp(`(["'])/public/${file}\\1`, "g");
            str = str.replace(regex, replaceWith);
        }
    }
    return str;
}

async function main() {
    // 1) Add meta to output
    let out = await fs.promises.readFile(META_PATH, 'utf8');

    // 2) Add licenses
    const licenses = licenseComments.join('\n');
    out += '\n\n' + licenses;

    // 2) Open setTimeout
    out += '\n\nsetTimeout(() => {\n';

    // 3) Read index.html
    let html = await fs.promises.readFile(HTML_PATH, 'utf8');

    // Remove lines containing 'crossorigin'
    html = html
        .split('\n')
        .filter(line => !line.includes('crossorigin'))
        .join('\n');

    // Escape backticks for template literal
    html = html.replace(/`/g, '\\`');

    // 4) Add document.documentElement.innerHTML line
    out += `const newHTML = \`${html}\`;\n`
        + `const parser = new DOMParser();\n`
        + `const newDoc = parser.parseFromString(newHTML, 'text/html');\n`
        + `document.replaceChild(document.adoptNode(newDoc.documentElement), document.documentElement);\n\n`;

    // 5) Stop propagation of all event listeners above document (step 4 removed on document, but we cannot remove on window so we need to do this)
    const listeners = EVENT_TYPES_TO_BLOCK.map(e =>
            `document.addEventListener("${e}", e => e.stopPropagation(), { passive: false });`
    ).join('\n');
    out += listeners + `\n\n`;

    // 6) Read CSS
    const css = await fs.promises.readFile(CSS_PATH, 'utf8');
    const cssEscaped = css.replace(/`/g, '\\`');
    out += `GM_addStyle(\`${cssEscaped}\`);\n\n`;

    // 7) Append infinite-fish.js content with replaces .ogg and .mp3 files
    const js = fs.readFileSync(JS_PATH, 'utf-8');
    out += js + '\n';

    // 8) Close setTimeout
    out += '}, 2000);\n';

    // 9) Encode all images / audio
    const files = await fs.promises.readdir(DIST_DIR);
    out = await replaceWithEncoded(out, files);

    // Write output
    await fs.promises.writeFile(OUTPUT_PATH, out, 'utf8');
    console.log('Built user script:', OUTPUT_PATH);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
