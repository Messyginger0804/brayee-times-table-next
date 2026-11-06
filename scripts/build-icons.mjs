// Regenerates all favicon/app icons from scripts/icons/helmet.svg.
// Usage: node scripts/build-icons.mjs
// Needs a Chromium binary: set CHROME=/path/to/chrome, or it uses Playwright's cache (~/.cache/ms-playwright).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = readFileSync(join(root, 'scripts/icons/helmet.svg'), 'utf8');
const facePath = join(root, 'public/braylee/face-512.webp');

// Face crops (square, from the 512px face image) as webp data URIs.
// wide: forehead to chin with a little shoulder, fills the visor. tight: face only, for 16-48px favicons.
async function faceUri(crop, px) {
  const buf = await sharp(facePath).extract(crop).resize(px, px).webp({ quality: 82 }).toBuffer();
  return `data:image/webp;base64,${buf.toString('base64')}`;
}
const wide = await faceUri({ left: 60, top: 118, width: 380, height: 380 }, 320);
const tight = await faceUri({ left: 120, top: 150, width: 260, height: 260 }, 160);

// Full helmet art: the empty helmet with her face in the visor instead of the "B".
const FACE_IN_VISOR = `<clipPath id="vis"><rect x="104" y="140" width="304" height="264" rx="116" ry="116"/></clipPath>
    <image href="${wide}" x="104" y="124" width="304" height="304" preserveAspectRatio="xMidYMid slice" clip-path="url(#vis)"/>
    <rect x="104" y="140" width="304" height="264" rx="116" ry="116" fill="none" stroke="#38f0ff" stroke-width="6"/>`;
const src = base.replace(/<!-- B glow \+ B -->[\s\S]*?(?=<!-- sheen -->)/, FACE_IN_VISOR + '\n    ').replace('stroke-opacity="0.75"', 'stroke-opacity="0.4"');

// Simplified helmet for tiny sizes: no ear caps or visor frame, thick rim, big round face.
const simple = base.replace(/<!--ART-->[\s\S]*<\/svg>/, `<!--ART-->
  <g id="art">
    <circle cx="256" cy="262" r="226" fill="url(#rim)"/>
    <clipPath id="face"><circle cx="256" cy="262" r="186"/></clipPath>
    <image href="${tight}" x="70" y="76" width="372" height="372" preserveAspectRatio="xMidYMid slice" clip-path="url(#face)"/>
    <circle cx="256" cy="262" r="186" fill="none" stroke="#38f0ff" stroke-width="14"/>
    <path d="M410 40 Q414 76 450 80 Q414 84 410 120 Q406 84 370 80 Q406 76 410 40Z" fill="#b6ff3b"/>
  </g>
</svg>`);

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = join(homedir(), '.cache/ms-playwright');
  if (existsSync(base)) {
    for (const d of readdirSync(base).filter((n) => n.startsWith('chromium-')).sort().reverse()) {
      const p = join(base, d, 'chrome-linux64/chrome');
      if (existsSync(p)) return p;
    }
  }
  throw new Error('No Chromium found; set CHROME=/path/to/chrome');
}
const chrome = findChrome();
const tmp = mkdtempSync(join(tmpdir(), 'icons-'));

// Variants: rounded (favicon), full-bleed solid bg (apple), maskable (full-bleed, art scaled into safe zone)
const full = src.replace('rx="112"', 'rx="0"');
const maskable = full.replace('<g id="art">', '<g id="art" transform="translate(51.2 51.2) scale(0.8)">');

function render(svg, size, transparent) {
  const f = join(tmp, `r${size}${transparent ? 't' : 'o'}${Math.random().toString(36).slice(2)}`);
  const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="display:block" `).replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body></html>`;
  writeFileSync(f + '.html', html);
  execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000', `--window-size=${size},${size}`,
    `--screenshot=${f}.png`, 'file://' + f + '.html'], { stdio: 'ignore' });
  return readFileSync(f + '.png');
}

const out = (p, buf) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), buf); console.log('wrote', p); };

out('app/icon.svg', Buffer.from(simple));
out('app/apple-icon.png', render(full, 180));
out('public/icons/icon-192.png', render(src, 192));
out('public/icons/icon-512.png', render(src, 512));
out('public/icons/icon-maskable-512.png', render(maskable, 512));

// ICO with embedded PNGs (16, 32, 48)
const sizes = [16, 32, 48];
const pngs = sizes.map((s) => render(simple, s));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((s, i) => {
  const o = 6 + 16 * i;
  head[o] = s; head[o + 1] = s; head[o + 2] = 0; head[o + 3] = 0;
  head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
  head.writeUInt32LE(pngs[i].length, o + 8); head.writeUInt32LE(off, o + 12);
  off += pngs[i].length;
});
out('app/favicon.ico', Buffer.concat([head, ...pngs]));
