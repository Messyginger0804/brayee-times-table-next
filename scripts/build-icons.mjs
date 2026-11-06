// Regenerates all favicon/app icons from scripts/icons/helmet.svg.
// Usage: node scripts/build-icons.mjs
// Needs a Chromium binary: set CHROME=/path/to/chrome, or it uses Playwright's cache (~/.cache/ms-playwright).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'scripts/icons/helmet.svg'), 'utf8');

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

out('app/icon.svg', Buffer.from(src));
out('app/apple-icon.png', render(full, 180));
out('public/icons/icon-192.png', render(src, 192));
out('public/icons/icon-512.png', render(src, 512));
out('public/icons/icon-maskable-512.png', render(maskable, 512));

// ICO with embedded PNGs (16, 32, 48)
const sizes = [16, 32, 48];
const pngs = sizes.map((s) => render(src, s));
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
