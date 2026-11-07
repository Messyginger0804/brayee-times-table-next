import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() }, $queryRaw: vi.fn() } }));
vi.mock('../../lib/savedCadetPurge', () => ({ purgeInactiveSaved: vi.fn(async () => 0) }));
import { prisma } from '../../lib/prisma';
import { verifyPin } from '../../lib/pinAuth';
import { purgeInactiveSaved } from '../../lib/savedCadetPurge';

const NOW = new Date('2026-06-01T12:00:00Z');
const HASH = bcrypt.hashSync('1234', 4);
const user = (o = {}) => ({ id: 7, name: 'Kid', isGuest: false, pin: HASH, failedLoginAttempts: 0, lockedUntil: null, level: 1, ...o });
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
    const secs = n >= 15 ? 1800 : n >= 10 ? 300 : n >= 5 ? 60 : 0;
    row.lockedUntil = secs ? new Date(Date.now() + secs * 1000) : null;
    return [{ fails: n }];
  });
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] }); // bcryptjs needs the real timers
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('verifyPin input validation', () => {
  it.each([[null, '1234'], ['', '1234'], ['   ', '1234'], ['Kid', null], ['Kid', ''], ['Kid', '123'], ['Kid', '123456'], ['Kid', 'abcd']])(
    'rejects name=%j pin=%j with 400 and never hits the store', async (n, p) => {
      expect(await verifyPin(n, p)).toEqual({ ok: false, status: 400, error: 'Name and your secret number (4 or 5 digits) required' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

  it('trims the name and accepts a numeric pin', async () => {
    store(user());
    const r = await verifyPin('  Kid ', 1234);
    expect(r.ok).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { name: 'Kid' } });
  });
});

describe('verifyPin lookup', () => {
  it('returns a generic 401 for a missing user (no user enumeration)', async () => {
    store(null);
    expect(await verifyPin('Nobody', '1234')).toEqual({ ok: false, status: 401, error: 'Invalid name or PIN' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses guest seats even if a pin matches', async () => {
    store(user({ isGuest: true, pin: '1234' }));
    expect(await verifyPin('Kid', '1234')).toMatchObject({ ok: false, status: 401 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([[null], ['']])('stored pin %j never matches and counts as a failure', async (pin) => {
    store(user({ pin }));
    expect(await verifyPin('Kid', '1234')).toMatchObject({ ok: false, status: 401 });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('verifyPin saved cadets (5-digit student ID)', () => {
  const saved = () => user({ name: 'Luna', savedCadet: true, pin: bcrypt.hashSync('24680', 4) });

  it('signs in with a 5-digit secret, matches the name case-insensitively, and counts as activity', async () => {
    store(saved());
    const r = await verifyPin('luna', '24680');
    expect(r.ok).toBe(true);
    expect(prisma.user.update.mock.calls[0][0].data.lastActiveAt).toEqual(NOW);
    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { name: { equals: 'luna', mode: 'insensitive' } }, take: 2 });
  });

  it('the exact name is found without the fallback; Braylee still signs in with her 4-digit PIN and gets no activity stamp', async () => {
    store(user({ name: 'Braylee' }));
    expect((await verifyPin('Braylee', '1234')).ok).toBe(true);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('lastActiveAt');
  });

  it('an ambiguous case-insensitive match signs nobody in', async () => {
    store(saved());
    prisma.user.findMany.mockResolvedValue([{ ...saved() }, { ...saved(), id: 8, name: 'LUNA' }]);
    expect(await verifyPin('lUNA', '24680')).toMatchObject({ ok: false, status: 401 });
  });

  it('wrong secret uses the same atomic lockout: 5th wrong = 1 minute rest, then even the right secret is refused', async () => {
    store(saved());
    for (let i = 0; i < 4; i++) expect(await verifyPin('Luna', '11111')).toMatchObject({ status: 401 });
    expect(await verifyPin('Luna', '11111')).toMatchObject({ status: 429, retryAfter: 60, error: "Let's take a short break! Try again in 60 seconds." });
    expect(await verifyPin('Luna', '24680')).toMatchObject({ ok: false, status: 429 });
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
    const r = await verifyPin('Kid', '1234');
    expect(r).toMatchObject({ ok: true, user: { id: 7 } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  });

  it('accepts $2y$ prefixed hashes', async () => {
    store(user({ pin: HASH.replace('$2a$', '$2y$') }));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
  });

  it('clears the fail counter on success', async () => {
    store(user({ failedLoginAttempts: 3 }));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  });

  it('wrong pin returns 401 and the attempt is counted by the atomic claim', async () => {
    const row = store(user());
    expect(await verifyPin('Kid', '9999')).toEqual({ ok: false, status: 401, error: 'Invalid name or PIN' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(row.failedLoginAttempts).toBe(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('verifyPin legacy plaintext pins', () => {
  it('accepts a correct plaintext pin and upgrades it to a bcrypt hash of that pin', async () => {
    store(user({ pin: '1234' }));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: 7 });
    expect(data).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
    expect(data.pin).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare('1234', data.pin)).toBe(true);
  });

  it('upgrade also resets a non-zero fail counter in the same write', async () => {
    store(user({ pin: '1234', failedLoginAttempts: 2 }));
    await verifyPin('Kid', '1234');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
    expect(prisma.user.update.mock.calls[0][0].data.pin).toMatch(/^\$2/);
  });

  it('a wrong guess against a plaintext pin does not upgrade or leak', async () => {
    store(user({ pin: '1234' }));
    expect(await verifyPin('Kid', '0000')).toMatchObject({ ok: false, status: 401 });
    expect(prisma.user.update).not.toHaveBeenCalled(); // counted by the atomic claim, no upgrade
  });

  it('after the upgrade the old plaintext no longer short-circuits: hash is verified', async () => {
    const row = store(user({ pin: '1234' }));
    await verifyPin('Kid', '1234');
    expect(row.pin).not.toBe('1234');
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
    expect((await verifyPin('Kid', '4321')).ok).toBe(false);
  });
});

describe('verifyPin lockout', () => {
  it('locks on the 5th consecutive failure (not before) and reports the 60s cooldown', async () => {
    const row = store(user());
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await verifyPin('Kid', '9999'));
    expect(results.slice(0, 4).every((r) => r.status === 401)).toBe(true);
    expect(results[4]).toEqual({ ok: false, status: 429, error: "Let's take a short break! Try again in 60 seconds.", retryAfter: 60 });
    expect(row.failedLoginAttempts).toBe(5);
    expect(row.lockedUntil).toEqual(inSeconds(60));
  });

  it('while locked, even the correct pin is refused and nothing is written', async () => {
    // the conditional claim matches no row while locked; the 429 comes from the lockedUntil read
    store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(30) }));
    const r = await verifyPin('Kid', '1234');
    expect(r).toEqual({ ok: false, status: 429, error: "Let's take a short break! Try again in 30 seconds.", retryAfter: 30 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('uses singular "second" and rounds partial seconds up', async () => {
    store(user({ failedLoginAttempts: 5, lockedUntil: new Date(NOW.getTime() + 500) }));
    const r = await verifyPin('Kid', '1234');
    expect(r.retryAfter).toBe(1);
    expect(r.error).toBe("Let's take a short break! Try again in 1 second.");
  });

  it('treats lockedUntil == now as expired', async () => {
    store(user({ failedLoginAttempts: 5, lockedUntil: new Date(NOW) }));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
  });

  it('after the cooldown a correct pin gets a fresh start', async () => {
    const row = store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(-5) }));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
    expect(row.failedLoginAttempts).toBe(0);
    expect(row.lockedUntil).toBeNull();
    expect(prisma.user.update).toHaveBeenCalledTimes(1); // the success reset
  });

  it('after the cooldown a wrong pin keeps counting (no fresh start) and re-locks at once', async () => {
    const row = store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(-5) }));
    expect(await verifyPin('Kid', '9999')).toMatchObject({ status: 429, retryAfter: 60 });
    expect(row.failedLoginAttempts).toBe(6);
    expect(row.lockedUntil).toEqual(inSeconds(60));
  });

  it('full cycle: lock, stay locked, then recover once the clock passes the cooldown', async () => {
    store(user({ failedLoginAttempts: 4 }));
    expect((await verifyPin('Kid', '9999')).status).toBe(429);
    expect((await verifyPin('Kid', '1234')).status).toBe(429);
    vi.setSystemTime(inSeconds(61));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
  });
});
