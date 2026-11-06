import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';

vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), update: vi.fn() } } }));
import { prisma } from '../../lib/prisma';
import { verifyPin } from '../../lib/pinAuth';

const NOW = new Date('2026-06-01T12:00:00Z');
const HASH = bcrypt.hashSync('1234', 4);
const user = (o = {}) => ({ id: 7, name: 'Kid', isGuest: false, pin: HASH, failedLoginAttempts: 0, lockedUntil: null, level: 1, ...o });
const inSeconds = (s) => new Date(NOW.getTime() + s * 1000);

/** In-memory single-row store behind the mocked prisma; applies {increment} like Prisma does. */
function store(initial) {
  const row = initial && { ...initial };
  prisma.user.findUnique.mockImplementation(async ({ where }) => (row && row.name === where.name ? { ...row } : null));
  prisma.user.update.mockImplementation(async ({ data }) => {
    for (const [k, v] of Object.entries(data)) row[k] = v && typeof v === 'object' && 'increment' in v ? row[k] + v.increment : v;
    return { ...row };
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
  it.each([[null, '1234'], ['', '1234'], ['   ', '1234'], ['Kid', null], ['Kid', ''], ['Kid', '123'], ['Kid', '12345'], ['Kid', 'abcd']])(
    'rejects name=%j pin=%j with 400 and never hits the store', async (n, p) => {
      expect(await verifyPin(n, p)).toEqual({ ok: false, status: 400, error: 'Name and a 4-digit PIN required' });
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
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: { increment: 1 } } });
  });
});

describe('verifyPin hashed pins', () => {
  it('accepts the correct pin without writing when there is nothing to reset', async () => {
    store(user());
    const r = await verifyPin('Kid', '1234');
    expect(r).toMatchObject({ ok: true, user: { id: 7 } });
    expect(prisma.user.update).not.toHaveBeenCalled();
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

  it('wrong pin returns 401 and increments the counter', async () => {
    store(user());
    expect(await verifyPin('Kid', '9999')).toEqual({ ok: false, status: 401, error: 'Invalid name or PIN' });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: { increment: 1 } } });
  });
});

describe('verifyPin legacy plaintext pins', () => {
  it('accepts a correct plaintext pin and upgrades it to a bcrypt hash of that pin', async () => {
    store(user({ pin: '1234' }));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: 7 });
    expect(Object.keys(data)).toEqual(['pin']);
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
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ failedLoginAttempts: { increment: 1 } });
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
    expect(prisma.user.update).toHaveBeenCalledTimes(1); // the reset only; success has nothing more to write
  });

  it('after the cooldown a wrong pin starts counting from 1 again, not from 5', async () => {
    const row = store(user({ failedLoginAttempts: 5, lockedUntil: inSeconds(-5) }));
    expect(await verifyPin('Kid', '9999')).toMatchObject({ status: 401 });
    expect(row.failedLoginAttempts).toBe(1);
    expect(row.lockedUntil).toBeNull();
  });

  it('full cycle: lock, stay locked, then recover once the clock passes the cooldown', async () => {
    store(user({ failedLoginAttempts: 4 }));
    expect((await verifyPin('Kid', '9999')).status).toBe(429);
    expect((await verifyPin('Kid', '1234')).status).toBe(429);
    vi.setSystemTime(inSeconds(61));
    expect((await verifyPin('Kid', '1234')).ok).toBe(true);
  });
});
