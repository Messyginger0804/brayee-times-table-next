import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() }, $queryRaw: vi.fn() } }));
vi.mock('../../lib/savedCadetPurge', () => ({ purgeInactiveSaved: vi.fn(async () => 0) }));
import { prisma } from '../../lib/prisma';
import { verifyPin, hashPin, cooldownFor, FAIL_MESSAGE } from '../../lib/pinAuth';
import { purgeInactiveSaved } from '../../lib/savedCadetPurge';

const NOW = new Date('2026-06-01T12:00:00Z');
const HASH = bcrypt.hashSync('12345', 4); // legacy: plain bcrypt, no pepper
let PEPPERED; // hashPin('12345'), what new rows hold
beforeAll(async () => { PEPPERED = await hashPin('12345'); });
const user = (o = {}) => ({ id: 7, name: 'Kid', isGuest: false, get pin() { return PEPPERED; }, failedLoginAttempts: 0, lockedUntil: null, level: 1, ...o });
const inSeconds = (s) => new Date(NOW.getTime() + s * 1000);

/** In-memory single-row store behind the mocked prisma. $queryRaw emulates the conditional UPDATE in claimAttempt (count + lock in one step). */
function store(initial) {
  const row = initial && { ...initial };
  prisma.user.findUnique.mockImplementation(async ({ where }) => (row && (row.name === where.name || row.id === where.id) ? { ...row } : null));
  prisma.user.findMany.mockImplementation(async ({ where }) => (row && row.name.toLowerCase() === where.name.equals.toLowerCase() ? [{ ...row }] : []));
  prisma.user.update.mockImplementation(async ({ data }) => {
    for (const [k, v] of Object.entries(data)) row[k] = v && typeof v === 'object' && 'increment' in v ? row[k] + v.increment : v;
    return { ...row };
  });
  prisma.$queryRaw.mockImplementation(async () => {
    if (!row || (row.lockedUntil && row.lockedUntil.getTime() > Date.now())) return [];
    const n = ++row.failedLoginAttempts;
    const secs = cooldownFor(n);
    row.lockedUntil = secs ? new Date(Date.now() + secs * 1000) : null;
    return [{ fails: n }];
  });
  return row;
}

let compares;
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] }); // bcryptjs needs the real timers
  vi.setSystemTime(NOW);
  compares = vi.spyOn(bcrypt, 'compare');
  process.env.VERCEL_ENV = 'production'; // rehash-on-success is production-only (see 'rehash gate' below)
});
afterEach(() => { vi.useRealTimers(); compares.mockRestore(); delete process.env.VERCEL_ENV; delete process.env.PIN_REHASH; });

describe('verifyPin input validation', () => {
  it.each([[null, '12345'], ['', '12345'], ['   ', '12345'], ['Kid', null], ['Kid', ''], ['Kid', '1234'], ['Kid', '123456789'], ['Kid', 'abcde']])(
    'rejects name=%j pin=%j with 400 and never hits the store', async (n, p) => {
      expect(await verifyPin(n, p)).toEqual({ ok: false, status: 400, error: 'Name and your student ID (5 to 8 digits) required' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

  it('trims the name and accepts a numeric pin', async () => {
    store(user());
    const r = await verifyPin('  Kid ', 12345);
    expect(r.ok).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { name: 'Kid' } });
  });
});

describe('verifyPin lookup', () => {
  it('returns a generic 401 for a missing user (no user enumeration)', async () => {
    store(null);
    expect(await verifyPin('Nobody', '12345')).toEqual({ ok: false, status: 401, error: FAIL_MESSAGE });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses guest seats even if a pin matches', async () => {
    store(user({ isGuest: true, pin: '12345' }));
    expect(await verifyPin('Kid', '12345')).toMatchObject({ ok: false, status: 401 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([[null], ['']])('stored pin %j never matches and counts as a failure', async (pin) => {
    store(user({ pin }));
    expect(await verifyPin('Kid', '12345')).toMatchObject({ ok: false, status: 401 });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

let SAVED; // hashPin('24680')
beforeAll(async () => { SAVED = await hashPin('24680'); });

describe('verifyPin saved cadets (5-8 digit student ID)', () => {
  const saved = () => user({ name: 'Luna', savedCadet: true, pin: SAVED });

  it('signs in with a 5-digit secret, matches the name case-insensitively, and counts as activity', async () => {
    store(saved());
    const r = await verifyPin('luna', '24680');
    expect(r.ok).toBe(true);
    expect(prisma.user.update.mock.calls[0][0].data.lastActiveAt).toEqual(NOW);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { name: { equals: 'luna', mode: 'insensitive' } }, take: 2 });
  });

  it('the exact name is found without the fallback; Braylee signs in with her student ID and gets no activity stamp', async () => {
    store(user({ name: 'Braylee' }));
    expect((await verifyPin('Braylee', '12345')).ok).toBe(true);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('lastActiveAt');
  });

  it('an ambiguous case-insensitive match signs nobody in', async () => {
    store(saved());
    prisma.user.findMany.mockResolvedValue([{ ...saved() }, { ...saved(), id: 8, name: 'LUNA' }]);
    expect(await verifyPin('lUNA', '24680')).toMatchObject({ ok: false, status: 401 });
  });

  it('wrong secret uses the same atomic lockout: the 5th wrong try rests the account, then even the right secret is refused (same answer throughout)', async () => {
    const row = store(saved());
    for (let i = 0; i < 5; i++) expect(await verifyPin('Luna', '11111')).toEqual({ ok: false, status: 401, error: FAIL_MESSAGE });
    expect(row.lockedUntil).toEqual(inSeconds(60));
    expect(await verifyPin('Luna', '24680')).toEqual({ ok: false, status: 401, error: FAIL_MESSAGE });
  });

  it('purges idle saved cadets before looking the name up', async () => {
    store(null);
    await verifyPin('Luna', '24680');
    expect(purgeInactiveSaved).toHaveBeenCalledWith(prisma);
  });
});

describe('verifyPin hashed pins', () => {
  it('accepts the correct pin and always resets the counter/lock (the attempt was already claimed)', async () => {
    store(user());
    const r = await verifyPin('Kid', '12345');
    expect(r).toMatchObject({ ok: true, user: { id: 7 } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  });

  it('accepts $2y$ prefixed hashes', async () => {
    store(user({ pin: HASH.replace('$2a$', '$2y$') }));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
  });

  it('clears the fail counter on success', async () => {
    store(user({ failedLoginAttempts: 3 }));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  });

  it('wrong pin returns 401 and the attempt is counted by the atomic claim', async () => {
    const row = store(user());
    expect(await verifyPin('Kid', '99999')).toEqual({ ok: false, status: 401, error: FAIL_MESSAGE });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(row.failedLoginAttempts).toBe(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('verifyPin legacy plaintext pins', () => {
  it('accepts a correct plaintext pin and upgrades it to a bcrypt hash of that pin', async () => {
    store(user({ pin: '12345' }));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: 7 });
    expect(data).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
    expect(data.pin).toMatch(/^\$2[aby]\$/);
    expect(data.pin).not.toBe('12345');
    expect(await bcrypt.compare('12345', data.pin)).toBe(false); // upgraded straight to the peppered format
  });

  it('upgrade also resets a non-zero fail counter in the same write', async () => {
    store(user({ pin: '12345', failedLoginAttempts: 2 }));
    await verifyPin('Kid', '12345');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
    expect(prisma.user.update.mock.calls[0][0].data.pin).toMatch(/^\$2/);
  });

  it('a wrong guess against a plaintext pin does not upgrade or leak', async () => {
    store(user({ pin: '12345' }));
    expect(await verifyPin('Kid', '00000')).toMatchObject({ ok: false, status: 401 });
    expect(prisma.user.update).not.toHaveBeenCalled(); // counted by the atomic claim, no upgrade
  });

  it('after the upgrade the old plaintext no longer short-circuits: hash is verified', async () => {
    const row = store(user({ pin: '12345' }));
    await verifyPin('Kid', '12345');
    expect(row.pin).not.toBe('12345');
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
    expect((await verifyPin('Kid', '54321')).ok).toBe(false);
  });
});

describe('verifyPin pepper', () => {
  it('new hashes are peppered: plain bcrypt of the PIN does not match, and the same PIN hashes differently each time (salted)', async () => {
    expect(await bcrypt.compare('12345', PEPPERED)).toBe(false);
    expect(await hashPin('12345')).not.toBe(PEPPERED);
  });

  it('a peppered row signs in and is NOT rewritten', async () => {
    store(user());
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
  });

  it('a legacy un-peppered bcrypt row (Braylee before the upgrade) still signs in and is rehashed with the pepper', async () => {
    const row = store(user({ pin: HASH }));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
    const { data } = prisma.user.update.mock.calls[0][0];
    expect(data.pin).toMatch(/^\$2[aby]\$/);
    expect(data.pin).not.toBe(HASH);
    expect(await bcrypt.compare('12345', data.pin)).toBe(false); // peppered now
    expect((await verifyPin('Kid', '12345')).ok).toBe(true); // and verifies on the next sign-in
    expect(row.pin).toBe(data.pin);
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    expect(prisma.user.update.mock.calls[1][0].data).not.toHaveProperty('pin'); // no second upgrade
  });

  it('a wrong secret never matches any of the three formats', async () => {
    for (const pin of [PEPPERED, HASH, '12345']) {
      store(user({ pin }));
      expect((await verifyPin('Kid', '54321')).ok).toBe(false);
    }
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('a different NEXTAUTH_SECRET invalidates peppered rows (documented: rotating it resets every PIN)', async () => {
    store(user());
    process.env.NEXTAUTH_SECRET = 'a-rotated-secret';
    try { expect((await verifyPin('Kid', '12345')).ok).toBe(false); } finally { process.env.NEXTAUTH_SECRET = 'test-secret'; }
  });

  it('refuses to hash without NEXTAUTH_SECRET instead of using a blank pepper', async () => {
    const old = process.env.NEXTAUTH_SECRET; delete process.env.NEXTAUTH_SECRET;
    try { await expect(hashPin('12345')).rejects.toThrow(/NEXTAUTH_SECRET/); } finally { process.env.NEXTAUTH_SECRET = old; }
  });
});

describe('verifyPin rehash gate (only production rewrites a stored hash)', () => {
  const rewritesPin = async (pin) => { prisma.user.update.mockClear(); store(user({ pin })); const r = await verifyPin('Kid', '12345'); return { ok: r.ok, wrote: 'pin' in prisma.user.update.mock.calls[0][0].data }; };

  it('production: legacy bcrypt and plaintext rows are rehashed', async () => {
    process.env.VERCEL_ENV = 'production';
    expect(await rewritesPin(HASH)).toEqual({ ok: true, wrote: true });
    expect(await rewritesPin('12345')).toEqual({ ok: true, wrote: true });
  });

  it.each([[undefined], ['preview'], ['development'], ['']])('VERCEL_ENV=%j: sign-in still works but nothing is rewritten', async (env) => {
    if (env === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = env;
    expect(await rewritesPin(HASH)).toEqual({ ok: true, wrote: false });
    expect(await rewritesPin('12345')).toEqual({ ok: true, wrote: false });
    // still resets the counter and lock
    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
  });

  it('PIN_REHASH=1 opts in outside production (local testing); other values do not', async () => {
    delete process.env.VERCEL_ENV;
    process.env.PIN_REHASH = '1';
    expect(await rewritesPin(HASH)).toEqual({ ok: true, wrote: true });
    process.env.PIN_REHASH = 'true';
    expect(await rewritesPin(HASH)).toEqual({ ok: true, wrote: false });
  });

  it('new saves are peppered in every environment', async () => {
    delete process.env.VERCEL_ENV;
    const h = await hashPin('24680');
    expect(await bcrypt.compare('24680', h)).toBe(false);
    store(user({ pin: h }));
    expect((await verifyPin('Kid', '24680')).ok).toBe(true);
  });
});

describe('verifyPin lockout', () => {
  it('the escalation schedule: 5 -> 1 min, 10 -> 5 min, 15 -> 30 min, 20 -> 2 h, 25+ -> 24 h', () => {
    expect([0, 4, 5, 9, 10, 14, 15, 19, 20, 24, 25, 40].map(cooldownFor)).toEqual([0, 0, 60, 60, 300, 300, 1800, 1800, 7200, 7200, 86400, 86400]);
  });

  it.each([[4, 60], [9, 300], [14, 1800], [19, 7200], [24, 86400], [60, 86400]])('the wrong try after %i misses sets a %i second rest', async (before, secs) => {
    const row = store(user({ failedLoginAttempts: before }));
    expect(await verifyPin('Kid', '99999')).toEqual({ ok: false, status: 401, error: FAIL_MESSAGE });
    expect(row.failedLoginAttempts).toBe(before + 1);
    expect(row.lockedUntil).toEqual(inSeconds(secs));
  });

  it('locks on the 5th consecutive failure (not before); every answer is the same generic 401', async () => {
    const row = store(user());
    const results = [];
    for (let i = 0; i < 5; i++) { results.push(await verifyPin('Kid', '99999')); if (i < 4) expect(row.lockedUntil).toBeNull(); }
    expect(results).toEqual(Array(5).fill({ ok: false, status: 401, error: FAIL_MESSAGE }));
    expect(row.failedLoginAttempts).toBe(5);
    expect(row.lockedUntil).toEqual(inSeconds(60));
  });

  it('while locked, even the correct pin gets the same generic answer, nothing is written, and the bcrypt work is the same', async () => {
    store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(30) }));
    compares.mockClear();
    const locked = await verifyPin('Kid', '12345');
    const lockedCompares = compares.mock.calls.length;
    expect(locked).toEqual({ ok: false, status: 401, error: FAIL_MESSAGE });
    expect(prisma.user.update).not.toHaveBeenCalled();
    store(null);
    compares.mockClear();
    await verifyPin('Nobody', '12345');
    expect(compares.mock.calls.length).toBe(lockedCompares); // unknown name: same two compares as a resting account
    expect(lockedCompares).toBe(2);
  });

  it('unknown name, wrong secret and resting account are indistinguishable (status + message), over five tries each', async () => {
    const seq = async (setup) => { setup(); const out = []; for (let i = 0; i < 5; i++) out.push(await verifyPin('Kid', '99999')); return out; };
    const unknown = await seq(() => store(null));
    const wrong = await seq(() => store(user()));
    const resting = await seq(() => store(user({ failedLoginAttempts: 7, lockedUntil: inSeconds(30) })));
    expect(wrong).toEqual(unknown);
    expect(resting).toEqual(unknown);
    expect(JSON.stringify(unknown)).not.toMatch(/break|second|minute|retryAfter/);
  });

  it('treats lockedUntil == now as expired', async () => {
    store(user({ failedLoginAttempts: 5, lockedUntil: new Date(NOW) }));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
  });

  it('after the cooldown a correct pin gets a fresh start', async () => {
    const row = store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(-5) }));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
    expect(row.failedLoginAttempts).toBe(0);
    expect(row.lockedUntil).toBeNull();
    expect(prisma.user.update).toHaveBeenCalledTimes(1); // the success reset
  });

  it('after the cooldown a wrong pin keeps counting (no fresh start) and re-locks at once', async () => {
    const row = store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(-5) }));
    expect(await verifyPin('Kid', '99999')).toMatchObject({ status: 401 });
    expect(row.failedLoginAttempts).toBe(6);
    expect(row.lockedUntil).toEqual(inSeconds(60));
  });

  it('full cycle: lock, stay locked, then recover once the clock passes the cooldown', async () => {
    store(user({ failedLoginAttempts: 4 }));
    await verifyPin('Kid', '99999'); // 5th miss starts the rest
    expect((await verifyPin('Kid', '12345')).ok).toBe(false);
    vi.setSystemTime(inSeconds(61));
    expect((await verifyPin('Kid', '12345')).ok).toBe(true);
  });
});
