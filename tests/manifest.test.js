import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import manifest from '../app/manifest';

const m = manifest();

describe('web app manifest', () => {
  it("is named after Braylee", () => {
    expect(m.name).toBe("Braylee's Mission Control");
    expect(m.short_name).toBe('Braylee');
  });
  it('keeps short_name short enough for a home screen', () => {
    expect(m.short_name.length).toBeLessThanOrEqual(12);
  });
  it('lists any and maskable icons that exist on disk', () => {
    expect(m.icons.map((i) => i.purpose)).toEqual(expect.arrayContaining(['any', 'maskable']));
    for (const icon of m.icons) {
      expect(existsSync(join(process.cwd(), 'public', icon.src)), icon.src).toBe(true);
    }
  });
  it('keeps the space theme colors', () => {
    expect(m.theme_color).toBe('#050816');
    expect(m.background_color).toBe('#050816');
  });
});
