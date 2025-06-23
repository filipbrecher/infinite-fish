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
    '// Twemoji "sparkles" SVG from svgrepo.com (https://www.svgrepo.com/svg/407500/sparkles)',
    '// Originally by Twitter, licensed under the MIT License',
    '// https://github.com/twitter/twemoji/blob/master/LICENSE',
    '//',
    '// Some SVG assets from svgrepo.com are licensed under CC BY 4.0',
    '// https://creativecommons.org/licenses/by/4.0/',
    '// These may include modified versions with color adjustments',
    '//',
    '// Other assets are under CC0 (Public Domain)',
    '// https://creativecommons.org/publicdomain/zero/1.0/',
];

async function replaceFavicon(html) {
    const faviconMatch = html.match(/<link\s+rel="icon"[^>]*href=["']\/public\/([^"']+\.png)["'][^>]*>/);
    if (faviconMatch) {
        const faviconFile = faviconMatch[1];
        const faviconPath = path.join(DIST_DIR, faviconFile);

        const pngData = await fs.promises.readFile(faviconPath);
        const base64 = pngData.toString('base64');
        const dataUrl = `data:image/png;base64,${base64}`;

        const replacement = `<link rel="icon" type="image/png" href="${dataUrl}" />`;

        return html.replace(faviconMatch[0], replacement);
    }
    return html;
}

async function replaceSVGImagesInCSS(files, cssWithBase64) {
    const svgFiles = files.filter(f => f.endsWith('.svg'));

    for (const svgFile of svgFiles) {
        const imgPath = path.join(DIST_DIR, svgFile);
        const imgData = await fs.promises.readFile(imgPath);

        const encoded = encodeURIComponent(imgData.toString('utf8'))
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
        const dataUrl = `url("data:image/svg+xml,${encoded}")`;

        const regex = new RegExp(`url\\(["']?/public/${svgFile}["']?\\)`, 'g');
        cssWithBase64 = cssWithBase64.replace(regex, dataUrl);
    }

    return cssWithBase64;
}

async function replacePNGImagesInCSS(files, cssWithBase64) {
    const pngFiles = files.filter(f => f.endsWith('.png'));

    for (const pngFile of pngFiles) {
        const imgPath = path.join(DIST_DIR, pngFile);
        const imgData = await fs.promises.readFile(imgPath);
        const base64 = imgData.toString('base64');
        const dataUrl = `url("data:image/png;base64,${base64}")`;

        const regex = new RegExp(`url\\(["']?/public/${pngFile}["']?\\)`, 'g');
        cssWithBase64 = cssWithBase64.replace(regex, dataUrl);
    }

    return cssWithBase64;
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

    // Replace favicon href
    html = await replaceFavicon(html);

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

    // 6) Read CSS and replace all url("/public/*.svg") in CSS with URI encoded images
    const css = await fs.promises.readFile(CSS_PATH, 'utf8');

    // Find all SVGs in dist
    const files = await fs.promises.readdir(DIST_DIR);

    let cssWithBase64 = css;
    cssWithBase64 = await replaceSVGImagesInCSS(files, cssWithBase64);
    cssWithBase64 = await replacePNGImagesInCSS(files, cssWithBase64);

    // Escape backticks in CSS and inject with GM_addStyle
    const cssWithBase64Escaped = cssWithBase64.replace(/`/g, '\\`');
    out += `GM_addStyle(\`${cssWithBase64Escaped}\`);\n\n`;

    // 7) Append infinite-fish.js content
    let js = fs.readFileSync(JS_PATH, 'utf-8');
    out += js + '\n';

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
