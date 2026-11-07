// Regenerates Braylee's transparent face cutout at 512 and 160 px from private/avatars/braylee-cutout.png
// (made by scripts/braylee-cutout.py; gitignored). Writes the committed host-face fallback
// (public/braylee/face-160.webp, face-512.webp) and, when private/avatars exists, the local copies
// (private/avatars/braylee-160.webp, braylee-512.webp) that private/avatars.json points at.
// Usage: node scripts/build-braylee-face.mjs   (needs the dev dependency `sharp`)
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cutout = join(root, 'private/avatars/braylee-cutout.png');
const out = join(root, 'public/braylee');
mkdirSync(out, { recursive: true });

for (const size of [160, 512]) {
  const buf = await sharp(cutout).resize(size, size, { kernel: 'lanczos3' }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  await sharp(buf).toFile(join(out, `face-${size}.webp`));
  console.log(`wrote public/braylee/face-${size}.webp`);
  if (existsSync(join(root, 'private/avatars'))) {
    await sharp(buf).toFile(join(root, `private/avatars/braylee-${size}.webp`));
    console.log(`wrote private/avatars/braylee-${size}.webp`);
  }
}
