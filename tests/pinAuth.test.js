import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// In-memory stand-in for prisma. $queryRaw emulates the single conditional UPDATE in lib/pinAuth.js; JS runs it
// synchronously, which matches Postgres serialising concurrent UPDATEs on one row.
const state = vi.hoisted(() => ({ users: [], now: () => Date.now() }));
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }) => {
        await Promise.resolve();
        const u = state.users.find((x) => x.id === where.id || x.name === where.name);
        return u ? { ...u } : null;
      },
      update: async ({ where, data }) => {
        const u = state.users.find((x) => x.id === where.id);
        Object.assign(u, data);
        return { ...u };
      },
    },
    $queryRaw: async (_strings, ...vals) => {
      const id = vals[vals.length - 1]; // the only interpolation that varies is the user id (last one)
      await Promise.resolve();
      const u = state.users.find((x) => x.id === id);
      if (!u || (u.lockedUntil && u.lockedUntil.getTime() > state.now())) return [];
      u.failedLoginAttempts += 1;
      const n = u.failedLoginAttempts;
      const secs = n >= 15 ? 1800 : n >= 10 ? 300 : n >= 5 ? 60 : 0;
      u.lockedUntil = secs ? new Date(state.now() + secs * 1000) : null;
      return [{ fails: n }];
    },
  },
}));

const { verifyPin, cooldownFor, lockMessage, MAX_FAILS, hashPin, isHashed } = await import('../lib/pinAuth');
const { _resetRateLimits } = await import('../lib/rateLimit');

const mk = async (extra = {}) => ({
  id: 1, name: 'Tester', isGuest: false, pin: await hashPin('1234'), failedLoginAttempts: 0, lockedUntil: null, ...extra,
});
let compares;
beforeEach(async () => {
  _resetRateLimits();
  state.now = () => Date.now();
  state.users = [await mk()];
  compares = vi.spyOn(bcrypt, 'compare');
  compares.mockClear();
});

describe('cooldownFor', () => {
  it('escalates 1 min / 5 min / 30 min', () => {
    expect([0, 4, 5, 9, 10, 14, 15, 40].map(cooldownFor)).toEqual([0, 0, 60, 60, 300, 300, 1800, 1800]);
  });
  it('speaks kid', () => {
    expect(lockMessage(1)).toBe("Let's take a short break! Try again in 1 second.");
    expect(lockMessage(300)).toContain('5 minutes');
  });
});

describe('verifyPin', () => {
  it('accepts the right PIN and rejects bad input / unknown / guest names', async () => {
    expect((await verifyPin('Tester', '1234')).ok).toBe(true);
    expect((await verifyPin('Tester', '12')).status).toBe(400);
    expect((await verifyPin('Nobody', '1234')).status).toBe(401);
    state.users.push({ id: 2, name: 'Guest 001', isGuest: true, pin: null, failedLoginAttempts: 0, lockedUntil: null });
    expect((await verifyPin('Guest 001', '1234')).status).toBe(401);
  });

  it('locks on the 5th wrong PIN and refuses even the right PIN while resting', async () => {
    for (let i = 1; i < MAX_FAILS; i++) expect((await verifyPin('Tester', '0000')).status).toBe(401);
    const fifth = await verifyPin('Tester', '0000');
    expect(fifth).toMatchObject({ status: 429, retryAfter: 60 });
    const during = await verifyPin('Tester', '1234');
    expect(during.status).toBe(429);
    expect(during.error).toMatch(/short break/);
  });

  it('escalates the cooldown and resets on success', async () => {
    let t = 1_000_000;
    state.now = () => t;
    const realNow = Date.now;
    Date.now = () => t;
    try {
      for (let i = 0; i < 5; i++) await verifyPin('Tester', '0000');
      t += 61_000;
      for (let i = 0; i < 4; i++) { expect((await verifyPin('Tester', '0000')).retryAfter).toBe(60); t += 61_000; }
      expect((await verifyPin('Tester', '0000')).retryAfter).toBe(300); // 10th wrong
      t += 301_000;
      expect((await verifyPin('Tester', '1234')).ok).toBe(true);
      expect(state.users[0]).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
      expect((await verifyPin('Tester', '0000')).status).toBe(401); // fresh start
    } finally { Date.now = realNow; }
  });

  it('a parallel burst of wrong PINs cannot test more than MAX_FAILS PINs', async () => {
    const results = await Promise.all(Array.from({ length: 40 }, () => verifyPin('Tester', '0000')));
    expect(compares.mock.calls.length).toBe(MAX_FAILS);
    expect(state.users[0].failedLoginAttempts).toBe(MAX_FAILS);
    expect(results.filter((r) => r.status === 401)).toHaveLength(MAX_FAILS - 1);
    expect(results.filter((r) => r.status === 429)).toHaveLength(40 - (MAX_FAILS - 1));
    expect(results.every((r) => !r.ok)).toBe(true);
  });

  it('upgrades a legacy plaintext PIN to a bcrypt hash on success', async () => {
    state.users[0].pin = '1234';
    const r = await verifyPin('Tester', '1234');
    expect(r.ok).toBe(true);
    expect(isHashed(state.users[0].pin)).toBe(true);
  });

  it('per-IP limit blocks a client that rotates through names', async () => {
    let last;
    for (let i = 0; i < 31; i++) last = await verifyPin(`Nobody${i}`, '0000', { ip: '9.9.9.9' });
    expect(last.status).toBe(429);
    expect((await verifyPin('Tester', '1234', { ip: '8.8.8.8' })).ok).toBe(true); // other IPs unaffected
  });

  it('answers 503 (not a crash) when the schema is behind the code', async () => {
    const { prisma } = await import('../lib/prisma');
    const orig = prisma.user.findUnique;
    prisma.user.findUnique = async () => { throw Object.assign(new Error('The column `User.isGuest` does not exist'), { code: 'P2022' }); };
    const r = await verifyPin('Tester', '1234');
    prisma.user.findUnique = orig;
    expect(r).toMatchObject({ ok: false, status: 503, maintenance: true });
  });
});
