import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const at = (p) => join(process.cwd(), p);

describe('generated icons', () => {
  it.each([
    ['app/apple-icon.png', 180],
    ['public/icons/icon-192.png', 192],
    ['public/icons/icon-512.png', 512],
    ['public/icons/icon-maskable-512.png', 512],
  ])('%s is %ipx square', async (p, size) => {
    const meta = await sharp(at(p)).metadata();
    expect([meta.width, meta.height]).toEqual([size, size]);
  });

  it('apple-icon has an opaque background (iOS paints transparency black)', async () => {
    const meta = await sharp(at('app/apple-icon.png')).metadata();
    expect(meta.hasAlpha).toBe(false);
  });

  it('favicon.ico holds 16, 32 and 48px PNG images', async () => {
    const b = readFileSync(at('app/favicon.ico'));
    const count = b.readUInt16LE(4);
    const sizes = [];
    for (let i = 0; i < count; i++) {
      const o = 6 + 16 * i;
      const png = b.subarray(b.readUInt32LE(o + 12), b.readUInt32LE(o + 12) + b.readUInt32LE(o + 8));
      const meta = await sharp(png).metadata();
      expect(meta.width).toBe(meta.height);
      sizes.push(meta.width);
    }
    expect(sizes).toEqual([16, 32, 48]);
  });

  it('icon.svg embeds her face and stays small', () => {
    const svg = readFileSync(at('app/icon.svg'), 'utf8');
    expect(svg).toContain('data:image/webp;base64,');
    expect(statSync(at('app/icon.svg')).size).toBeLessThan(60 * 1024);
  });
});

describe('share images', () => {
  it.each(['app/opengraph-image.png', 'app/twitter-image.png'])('%s is 1200x630', async (p) => {
    const meta = await sharp(at(p)).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 630]);
  });
  it.each(['app/opengraph-image.alt.txt', 'app/twitter-image.alt.txt'])('%s has alt text', (p) => {
    expect(readFileSync(at(p), 'utf8').trim().length).toBeGreaterThan(10);
  });
});
