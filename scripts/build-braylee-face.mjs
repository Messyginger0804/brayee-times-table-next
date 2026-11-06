// Regenerates the committed host-face fallback (public/braylee/face-160.webp, face-512.webp) from public/Braylee.jpg.
// Usage: node scripts/build-braylee-face.mjs   (needs the dev dependency `sharp`)
// The crop box is in source-photo pixels (the photo is 1347x1797); adjust CROP if the source image changes.
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CROP = { left: 565, top: 700, width: 230, height: 230 };
const out = join(root, 'public/braylee');
mkdirSync(out, { recursive: true });

for (const size of [160, 512]) {
  await sharp(join(root, 'public/Braylee.jpg'))
    .extract(CROP)
    .resize(size, size, { kernel: 'lanczos3' })
    .webp({ quality: 82 })
    .toFile(join(out, `face-${size}.webp`));
  console.log(`wrote public/braylee/face-${size}.webp`);
}
