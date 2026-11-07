import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'));
// Vercel skips the build when the ignoreCommand exits 0.
const skips = (ref) => {
  const env = { PATH: process.env.PATH };
  if (ref !== undefined) env.VERCEL_GIT_COMMIT_REF = ref;
  return spawnSync('sh', ['-c', cfg.ignoreCommand], { env }).status === 0;
};

describe('vercel.json', () => {
  it('builds main, skips feature branches, and builds when there is no git ref (CLI deploys)', () => {
    expect(skips('main')).toBe(false);
    expect(skips('voice-picker')).toBe(true);
    expect(skips(undefined)).toBe(false);
    expect(skips('')).toBe(false);
  });
  it('keeps the purge-guests cron', () => {
    expect(cfg.crons).toEqual([{ path: '/api/cron/purge-guests', schedule: '0 4 * * *' }]);
  });
});
