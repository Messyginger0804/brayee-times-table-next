// Builds the 1200x630 link-share image (app/opengraph-image.png and app/twitter-image.png).
// Run scripts/build-icons.mjs first (uses public/icons/icon-512.png). Usage: node scripts/build-og-image.mjs
// Text is rendered by sharp (librsvg) with a locally installed font; fontconfig must find one of FONT_FAMILIES.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200;
const H = 630;
const FONT_FAMILIES = "'DejaVu Sans', 'Liberation Sans', sans-serif";

// Deterministic star field (small LCG, fixed seed).
function stars(count) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: count }, () => {
    const r = (0.8 + rnd() * 1.8).toFixed(1);
    return `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${r}" fill="#fff" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`;
  }).join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="sky" cx="25%" cy="0%" r="110%">
      <stop offset="0" stop-color="#2a1a6e"/><stop offset="0.5" stop-color="#121a4a"/><stop offset="1" stop-color="#050816"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#38f0ff" stop-opacity="0.35"/><stop offset="1" stop-color="#38f0ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars(90)}
  <circle cx="270" cy="315" r="330" fill="url(#halo)"/>
  <g font-family="${FONT_FAMILIES}" font-weight="700">
    <text x="530" y="270" font-size="68" fill="#38f0ff">Braylee's</text>
    <text x="530" y="355" font-size="68" fill="#ffffff">Mission Control</text>
    <text x="532" y="425" font-size="30" font-weight="400" fill="#cbc3ff">Times tables &amp; spelling bee practice</text>
  </g>
  <rect x="532" y="458" width="150" height="8" rx="4" fill="#b6ff3b"/>
</svg>`;

const icon = await sharp(join(root, 'public/icons/icon-512.png')).resize(420, 420).toBuffer();
const png = await sharp(Buffer.from(svg)).composite([{ input: icon, left: 60, top: 105 }]).png({ compressionLevel: 9 }).toBuffer();

for (const name of ['opengraph-image.png', 'twitter-image.png']) {
  writeFileSync(join(root, 'app', name), png);
  console.log('wrote app/' + name);
}
