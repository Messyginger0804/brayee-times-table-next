import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import path from 'path';

const { savedCadetRefusal } = createRequire(import.meta.url)('../scripts/lib/savedCadetGuard.js');

describe('cleanup-accounts saved-cadet guard', () => {
  it('refuses while saved cadets exist', () => {
    expect(savedCadetRefusal(1, false)).toMatch(/Refusing to run: 1 saved cadet exist/);
    expect(savedCadetRefusal(3, false)).toMatch(/3 saved cadets/);
    expect(savedCadetRefusal(3, false)).toMatch(/--include-saved-cadets/);
  });
  it('goes ahead with none, or with the explicit flag', () => {
    expect(savedCadetRefusal(0, false)).toBeNull();
    expect(savedCadetRefusal(0, true)).toBeNull();
    expect(savedCadetRefusal(2, true)).toBeNull();
  });
  it('the script itself wires the flag and checks before it opens the transaction', async () => {
    const src = (await import('fs')).readFileSync(path.join(__dirname, '../scripts/cleanup-accounts.js'), 'utf8');
    expect(src).toMatch(/args\.has\('--include-saved-cadets'\)/);
    expect(src.indexOf('savedCadetRefusal(await')).toBeGreaterThan(0);
    expect(src.indexOf('savedCadetRefusal(await')).toBeLessThan(src.indexOf('prisma.$transaction'));
  });
  it('exits 2 without a DATABASE_URL (sanity that the script is runnable and gated)', () => {
    const r = spawnSync('node', [path.join(__dirname, '../scripts/cleanup-accounts.js')], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
    expect(r.status).toBe(2);
  });
});
