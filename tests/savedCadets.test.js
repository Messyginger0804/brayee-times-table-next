import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { SavedCadetError, fullMessage, saveCadet } from '../lib/savedCadets';
import { purgeInactiveSaved, retentionDays, savedCadetsMax, validateSavedSession, _resetSavedCache } from '../lib/savedCadetPurge';
import { guestSeatCount, hashToken } from '../lib/guests';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-01T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * DAY);
const TABLES = ['attempt', 'test', 'spellingAttempt', 'mathAttempt', 'mathSkillProgress', 'userProblem', 'account', 'session'];

/** In-memory prisma stand-in: just enough of User plus per-user child tables. $transaction snapshots and rolls back on throw. */
function fakeDb() {
  const users = []; const rows = Object.fromEntries(TABLES.map((t) => [t, []]));
  let nextId = 1;
  const eq = (u, k, v) => {
    if (k === 'OR') return v.some((c) => match(u, c));
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('not' in v) return u[k] !== v.not;
      if ('lte' in v) return u[k] <= v.lte;
      if ('lt' in v) return u[k] != null && u[k] < v.lt;
      if ('equals' in v) return String(u[k]).toLowerCase() === String(v.equals).toLowerCase();
    }
    if (v === null) return u[k] == null;
    if (v instanceof Date) return u[k] instanceof Date && u[k].getTime() === v.getTime();
    return u[k] === v;
  };
  const match = (u, w = {}) => Object.entries(w).every(([k, v]) => eq(u, k, v));
  const blank = { isGuest: false, guestSeat: null, guestTokenHash: null, savedCadet: false, savedAt: null, lastActiveAt: null, pin: null, level: 1, grade: null, failedLoginAttempts: 0, lockedUntil: null };
  const db = {
    users, rows,
    add: (u) => { const r = { ...blank, id: nextId++, ...u }; users.push(r); return r; },
    $executeRaw: async () => 1,
    // the purge's row lock: SELECT ... WHERE id AND savedCadet AND name <> 'Braylee' AND lastActiveAt IS NOT DISTINCT FROM $ FOR UPDATE
    $queryRaw: async (_s, id, braylee, last) => {
      const u = users.find((x) => x.id === id);
      const same = (u?.lastActiveAt ?? null) === null ? last == null : last != null && u.lastActiveAt.getTime() === new Date(last).getTime();
      return u && u.savedCadet && u.name !== braylee && same ? [{ ok: 1 }] : [];
    },
    user: {
      count: async ({ where }) => users.filter((u) => match(u, where)).length,
      findMany: async ({ where }) => users.filter((u) => match(u, where)).map((u) => ({ ...u })),
      findFirst: async ({ where }) => { const u = users.find((x) => match(x, where)); return u ? { ...u } : null; },
      findUnique: async ({ where }) => { const u = users.find((x) => x.id === where.id); return u ? { ...u } : null; },
      createMany: async ({ data }) => { for (const d of data) if (!users.some((u) => u.name === d.name || (d.guestSeat && u.guestSeat === d.guestSeat))) db.add(d); },
      updateMany: async ({ where, data }) => { const hit = users.filter((u) => match(u, where)); hit.forEach((u) => Object.assign(u, data)); return { count: hit.length }; },
      delete: async ({ where }) => { users.splice(users.findIndex((u) => u.id === where.id), 1); },
    },
    $transaction: async (fn) => {
      const snap = { users: users.map((u) => ({ ...u })), rows: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, [...v]])) };
      try { return await fn(db); } catch (e) {
        users.splice(0, users.length, ...snap.users); Object.assign(rows, snap.rows); throw e;
      }
    },
  };
  for (const t of TABLES) db[t] = { deleteMany: async ({ where }) => { rows[t] = rows[t].filter((r) => r.userId !== where.userId); } };
  return db;
}

const TOKEN = hashToken('seat-secret');
const seedGuest = (db, seat = 1, extra = {}) => db.add({ name: `Guest ${String(seat).padStart(3, '0')}`, isGuest: true, guestSeat: seat, guestTokenHash: TOKEN, lastActiveAt: NOW, ...extra });
const seedSaved = (db, name, lastActiveAt, extra = {}) => db.add({ name, savedCadet: true, savedAt: daysAgo(90), lastActiveAt, pin: 'HASH', ...extra });

let db;
beforeEach(() => {
  db = fakeDb(); _resetSavedCache();
  process.env.GUEST_SEATS = '3';
  delete process.env.SAVED_CADETS_MAX; delete process.env.SAVED_CADET_RETENTION_DAYS;
});
afterEach(() => { delete process.env.GUEST_SEATS; vi.restoreAllMocks(); });

describe('config', () => {
  it('defaults to 10 spots and 30 days, reads env, clamps junk', () => {
    expect([savedCadetsMax(), retentionDays()]).toEqual([10, 30]);
    process.env.SAVED_CADETS_MAX = '3'; process.env.SAVED_CADET_RETENTION_DAYS = '7';
    expect([savedCadetsMax(), retentionDays()]).toEqual([3, 7]);
    process.env.SAVED_CADETS_MAX = 'lots'; process.env.SAVED_CADET_RETENTION_DAYS = '-4';
    expect([savedCadetsMax(), retentionDays()]).toEqual([10, 1]);
  });
  it('the full message names the cap', () => {
    expect(fullMessage()).toBe('All 10 saved cadet spots are taken right now. You can still play as a guest! 🚀');
    process.env.SAVED_CADETS_MAX = '4';
    expect(fullMessage()).toContain('All 4 saved cadet spots');
  });
});

describe('saveCadet', () => {
  it.each(['12345', '1234567', 'abcdef', '12 456', '123-456', '１２３４５６', '١٢٣٤٥٦', '', 123456])('rejects student ID %j with code secret before touching the database', async (bad) => {
    const seat = seedGuest(db, 2);
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', bad, NOW)).rejects.toMatchObject({ code: 'secret', message: 'Your student ID is 6 numbers.' });
    expect(db.users.find((x) => x.id === seat.id).isGuest).toBe(true);
  });
  it('accepts a leading-zero student ID', async () => {
    const seat = seedGuest(db, 2);
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '012345', NOW)).resolves.toEqual({ name: 'Luna' });
  });

  it('converts the seat in place: keeps the id and progress, hashes the ID, leaves the guest pool', async () => {
    const seat = seedGuest(db, 2, { level: 3, grade: 4, failedLoginAttempts: 2 });
    db.rows.mathSkillProgress.push({ userId: seat.id, skillId: 'x' }); db.rows.attempt.push({ userId: seat.id });
    const r = await saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW);
    expect(r).toEqual({ name: 'Luna' });
    const u = db.users.find((x) => x.id === seat.id);
    expect(u).toMatchObject({ name: 'Luna', isGuest: false, guestSeat: null, guestTokenHash: null, savedCadet: true, level: 3, grade: 4, failedLoginAttempts: 0 });
    expect(u.savedAt).toEqual(NOW); expect(u.lastActiveAt).toEqual(NOW);
    expect(u.pin).not.toContain('246801');
    expect(u.pin).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare('246801', u.pin)).toBe(false); // peppered: a plain bcrypt of the ID does not match
    expect(db.rows.mathSkillProgress).toHaveLength(1); expect(db.rows.attempt).toHaveLength(1); // progress kept
  });

  it('refills the guest pool back to GUEST_SEATS with an empty, free seat', async () => {
    const s1 = seedGuest(db, 1); seedGuest(db, 2, { guestTokenHash: hashToken('other') }); seedGuest(db, 3, { guestTokenHash: null });
    await saveCadet(db, { id: s1.id, gk: TOKEN }, 'Luna', '246801', NOW);
    const pool = db.users.filter((u) => u.isGuest);
    expect(pool).toHaveLength(guestSeatCount());
    expect(pool.map((u) => u.guestSeat).sort()).toEqual([1, 2, 3]);
    const fresh = pool.find((u) => u.guestSeat === 1);
    expect(fresh.id).not.toBe(s1.id); expect(fresh.guestTokenHash).toBeNull(); // brand new, free, nobody's progress
  });

  it('refuses when the cap is reached (Braylee does not count)', async () => {
    process.env.SAVED_CADETS_MAX = '2';
    db.add({ name: 'Braylee', pin: 'H' }); seedSaved(db, 'A1', NOW); seedSaved(db, 'B2', NOW);
    const seat = seedGuest(db);
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW)).rejects.toMatchObject({ code: 'full', message: expect.stringContaining('All 2 saved cadet spots are taken') });
    expect(db.users.find((u) => u.id === seat.id).isGuest).toBe(true); // untouched
  });

  it('Braylee does not use up a spot', async () => {
    process.env.SAVED_CADETS_MAX = '1';
    db.add({ name: 'Braylee', pin: 'H' });
    const seat = seedGuest(db);
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW)).resolves.toEqual({ name: 'Luna' });
  });

  it('a long-idle saved cadet frees their spot first', async () => {
    process.env.SAVED_CADETS_MAX = '1';
    seedSaved(db, 'Old', daysAgo(40));
    const seat = seedGuest(db);
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW)).resolves.toEqual({ name: 'Luna' });
    expect(db.users.some((u) => u.name === 'Old')).toBe(false);
  });

  it('names are unique case-insensitively', async () => {
    seedSaved(db, 'Luna', NOW);
    const seat = seedGuest(db);
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'LUNA', '246801', NOW)).rejects.toMatchObject({ code: 'taken' });
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'luna', '246801', NOW)).rejects.toBeInstanceOf(SavedCadetError);
  });

  it('a seat that lost its token (wiped, taken over, already saved) cannot be saved', async () => {
    const seat = seedGuest(db, 1, { guestTokenHash: hashToken('rotated') });
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW)).rejects.toMatchObject({ code: 'seat' });
    expect(db.users.find((u) => u.id === seat.id).savedCadet).toBe(false);
  });

  it('a real account (no seat key) cannot be saved', async () => {
    const braylee = db.add({ name: 'Braylee', pin: 'H' });
    await expect(saveCadet(db, { id: braylee.id, gk: null }, 'Luna', '246801', NOW)).rejects.toMatchObject({ code: 'seat' });
  });

  it('maps a unique-constraint race to "taken"', async () => {
    const seat = seedGuest(db);
    db.user.updateMany = async () => { throw Object.assign(new Error('dup'), { code: 'P2002' }); };
    await expect(saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW)).rejects.toMatchObject({ code: 'taken' });
  });

  it('never logs the student ID', async () => {
    const spies = ['log', 'error', 'warn', 'info', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const seat = seedGuest(db);
    await saveCadet(db, { id: seat.id, gk: TOKEN }, 'Luna', '246801', NOW);
    await saveCadet(db, { id: seat.id, gk: TOKEN }, 'Nova', '246801', NOW).catch(() => {});
    expect(JSON.stringify(spies.map((s) => s.mock.calls))).not.toContain('246801');
  });
});

describe('retention purge', () => {
  const addKid = (userId) => TABLES.forEach((t) => db.rows[t].push({ userId, name: t }));

  it('deletes a saved cadet idle for more than 30 days with ALL their data, and keeps the rest', async () => {
    const stale = seedSaved(db, 'Stale', daysAgo(31)); const fresh = seedSaved(db, 'Fresh', daysAgo(29));
    addKid(stale.id); addKid(fresh.id);
    expect(await purgeInactiveSaved(db, NOW)).toBe(1);
    expect(db.users.map((u) => u.name)).toEqual(['Fresh']);
    for (const t of TABLES) expect(db.rows[t].map((r) => r.userId)).toEqual([fresh.id]);
  });

  it('honours SAVED_CADET_RETENTION_DAYS', async () => {
    process.env.SAVED_CADET_RETENTION_DAYS = '10';
    seedSaved(db, 'Idle11', daysAgo(11)); seedSaved(db, 'Idle9', daysAgo(9));
    expect(await purgeInactiveSaved(db, NOW)).toBe(1);
    expect(db.users.map((u) => u.name)).toEqual(['Idle9']);
  });

  it('falls back to savedAt when there is no lastActiveAt; deletes when both are missing', async () => {
    seedSaved(db, 'OldSave', null, { savedAt: daysAgo(31) }); seedSaved(db, 'NewSave', null, { savedAt: daysAgo(2) }); seedSaved(db, 'Nothing', null, { savedAt: null });
    expect(await purgeInactiveSaved(db, NOW)).toBe(2);
    expect(db.users.map((u) => u.name)).toEqual(['NewSave']);
  });

  it('Braylee is never purged, even flagged by mistake or idle for years; neither are guests or unflagged users', async () => {
    db.add({ name: 'Braylee', pin: 'H', lastActiveAt: daysAgo(900) });
    seedSaved(db, 'Braylee', daysAgo(900), { id: 99 });
    db.add({ name: 'Guest 001', isGuest: true, guestSeat: 1, guestTokenHash: TOKEN, lastActiveAt: daysAgo(900) });
    db.add({ name: 'Legacy', pin: 'H', lastActiveAt: daysAgo(900) });
    expect(await purgeInactiveSaved(db, NOW)).toBe(0);
    expect(db.users).toHaveLength(4);
  });

  it('skips a cadet who became active between the read and the delete', async () => {
    const u = seedSaved(db, 'Racer', daysAgo(40));
    const real = db.user.findMany;
    db.user.findMany = async (a) => { const r = await real(a); u.lastActiveAt = NOW; return r; }; // activity lands after the stale read
    expect(await purgeInactiveSaved(db, NOW)).toBe(0);
    expect(db.users).toHaveLength(1);
  });

  it('a failing delete is logged by code only and does not stop the others', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    seedSaved(db, 'Boom', daysAgo(40)); seedSaved(db, 'Fine', daysAgo(40));
    const real = db.test.deleteMany; let n = 0;
    db.test.deleteMany = async (a) => { if (++n === 1) throw Object.assign(new Error('secret detail'), { code: 'P2003' }); return real(a); };
    expect(await purgeInactiveSaved(db, NOW)).toBe(1);
    expect(err).toHaveBeenCalledWith('[saved-purge] failed P2003');
    expect(db.users.map((u) => u.name)).toEqual(['Boom']); // rolled back whole
  });
});

describe('validateSavedSession', () => {
  it('true for a live saved cadet (and bumps lastActiveAt at most once a minute); false once they are gone or never were saved', async () => {
    const u = seedSaved(db, 'Luna', daysAgo(1));
    expect(await validateSavedSession(u.id, db, NOW)).toBe(true);
    expect(db.users[0].lastActiveAt).toEqual(NOW);
    const later = new Date(NOW.getTime() + 10 * 1000);
    await validateSavedSession(u.id, db, later);
    expect(db.users[0].lastActiveAt).toEqual(NOW); // throttled
    const g = seedGuest(db);
    expect(await validateSavedSession(g.id, db, NOW)).toBe(false);
    expect(await validateSavedSession(12345, db, NOW)).toBe(false);
  });

  it('purges stale cadets lazily, so an expired session is refused', async () => {
    const u = seedSaved(db, 'Gone', daysAgo(45));
    expect(await validateSavedSession(u.id, db, NOW)).toBe(false);
    expect(db.users).toHaveLength(0);
  });
});
