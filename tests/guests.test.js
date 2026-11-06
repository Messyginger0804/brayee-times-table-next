import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GUEST_IDLE_MS, TOUCH_INTERVAL_MS, claimSeat, cookieValue, findSeatByToken, hashToken, isExpired, pickSeat,
  guestSeatCount, purgeExpired, releaseByToken, seatLabel, touchGuest, validateGuestSession, _resetTouchCache,
} from '../lib/guests';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-06-01T12:00:00Z');
const at = (ms) => new Date(T0.getTime() + ms);

/** Minimal in-memory stand-in for the bits of prisma that lib/guests.js uses. */
function fakeDb() {
  const users = [];
  const data = { attempt: [], test: [], spellingAttempt: [], mathAttempt: [], mathSkillProgress: [], userProblem: [] };
  let nextId = 1;
  const matchWhere = (u, w = {}) => Object.entries(w).every(([k, v]) => {
    if (k === 'OR') return v.some((c) => matchWhere(u, c));
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('not' in v) return u[k] !== v.not;
      if ('lte' in v) return u[k] <= v.lte;
      if ('lt' in v) return u[k] !== null && u[k] !== undefined && u[k] < v.lt;
    }
    if (v === null) return u[k] === null || u[k] === undefined;
    return u[k] === v;
  });
  const db = {
    users, data,
    user: {
      createMany: async ({ data: rows }) => {
        for (const r of rows) if (!users.some((u) => u.name === r.name)) {
          users.push({ id: nextId++, grade: null, level: 1, guestTokenHash: null, lastActiveAt: null, failedLoginAttempts: 0, lockedUntil: null, ...r });
        }
      },
      findMany: async ({ where }) => users.filter((u) => matchWhere(u, where)).map((u) => ({ ...u })),
      findFirst: async ({ where }) => { const u = users.find((x) => matchWhere(x, where)); return u ? { ...u } : null; },
      findUnique: async ({ where }) => { const u = users.find((x) => x.id === where.id); return u ? { ...u } : null; },
      update: async ({ where, data: d }) => { Object.assign(users.find((x) => x.id === where.id), d); },
      updateMany: async ({ where, data: d }) => {
        const hit = users.filter((u) => matchWhere(u, where));
        hit.forEach((u) => Object.assign(u, d));
        return { count: hit.length };
      },
    },
    $transaction: async (ops) => Promise.all(ops),
  };
  for (const k of Object.keys(data)) {
    db[k] = { deleteMany: async ({ where }) => { data[k] = data[k].filter((r) => r.userId !== where.userId); } };
  }
  return db;
}

const seatOf = (db, n) => db.users.find((u) => u.guestSeat === n);

beforeEach(() => _resetTouchCache());
afterEach(() => { delete process.env.GUEST_SEATS; });

describe('pickSeat (pure)', () => {
  it('takes the lowest-numbered free seat first', () => {
    const seats = [
      { guestSeat: 1, guestTokenHash: 'a', lastActiveAt: at(0) },
      { guestSeat: 2, guestTokenHash: null, lastActiveAt: null },
      { guestSeat: 3, guestTokenHash: null, lastActiveAt: null },
    ];
    expect(pickSeat(seats)).toMatchObject({ reuse: false, seat: { guestSeat: 2 } });
  });
  it('reuses the longest-idle seat when all are taken', () => {
    const seats = [1, 2, 3, 4, 5].map((n) => ({ guestSeat: n, guestTokenHash: `h${n}`, lastActiveAt: at(n === 4 ? -3 * DAY : -n * 1000) }));
    expect(pickSeat(seats)).toMatchObject({ reuse: true, seat: { guestSeat: 4 } });
  });
  it('breaks idle ties by seat number and returns null with no seats', () => {
    const seats = [3, 1, 2].map((n) => ({ guestSeat: n, guestTokenHash: 'x', lastActiveAt: at(0) }));
    expect(pickSeat(seats).seat.guestSeat).toBe(1);
    expect(pickSeat([])).toBeNull();
  });
});

describe('isExpired', () => {
  it('is only true for claimed seats idle more than 7 days', () => {
    expect(isExpired({ guestTokenHash: 'h', lastActiveAt: at(-6 * DAY) }, T0)).toBe(false);
    expect(isExpired({ guestTokenHash: 'h', lastActiveAt: at(-8 * DAY) }, T0)).toBe(true);
    expect(isExpired({ guestTokenHash: null, lastActiveAt: null }, T0)).toBe(false);
  });
});

describe('claimSeat', () => {
  it('creates Guest 001... and hands out seats in order, storing only a hash', async () => {
    const db = fakeDb();
    const a = await claimSeat(db, T0);
    const b = await claimSeat(db, T0);
    expect(db.users.map((u) => u.name)).toEqual(['Guest 001', 'Guest 002', 'Guest 003', 'Guest 004', 'Guest 005']);
    expect([a.user.guestSeat, b.user.guestSeat]).toEqual([1, 2]);
    expect(a.user.guestTokenHash).toBe(hashToken(a.token));
    expect(a.user.guestTokenHash).not.toBe(a.token);
    expect(a.user.isGuest).toBe(true);
    expect(seatLabel(3)).toBe('003');
  });

  it('reuses the longest-idle seat when full: wipes it, rotates the token, old token loses access', async () => {
    const db = fakeDb();
    const claims = [];
    for (let i = 0; i < 5; i++) claims.push(await claimSeat(db, at(i * 1000)));
    // seat 3 has been idle the longest; everyone else played later
    seatOf(db, 3).lastActiveAt = at(-2 * DAY);
    seatOf(db, 3).grade = 4;
    db.data.attempt.push({ userId: seatOf(db, 3).id }, { userId: seatOf(db, 1).id });
    db.data.userProblem.push({ userId: seatOf(db, 3).id });
    const oldHash = seatOf(db, 3).guestTokenHash;

    const sixth = await claimSeat(db, at(60_000));
    expect(sixth.user.guestSeat).toBe(3);
    expect(sixth.user.guestTokenHash).not.toBe(oldHash);
    expect(sixth.user.grade).toBeNull();
    expect(db.data.attempt).toEqual([{ userId: seatOf(db, 1).id }]); // seat 3's data gone, seat 1's untouched
    expect(db.data.userProblem).toEqual([]);
    expect(await findSeatByToken(claims[2].token, db, at(60_000))).toBeNull(); // old device
    expect((await findSeatByToken(sixth.token, db, at(60_000))).guestSeat).toBe(3);
    expect((await findSeatByToken(claims[0].token, db, at(60_000))).guestSeat).toBe(1); // others unaffected
  });

  it('a released seat is free again and is the next one handed out', async () => {
    const db = fakeDb();
    const a = await claimSeat(db, T0);
    await claimSeat(db, T0);
    expect(await releaseByToken(a.token, db, T0)).toBe(true);
    expect((await claimSeat(db, T0)).user.guestSeat).toBe(1);
  });
});

describe('GUEST_SEATS setting', () => {
  it('defaults to 5 and clamps to 1-100', () => {
    expect(guestSeatCount()).toBe(5);
    process.env.GUEST_SEATS = '0'; expect(guestSeatCount()).toBe(1);
    process.env.GUEST_SEATS = '500'; expect(guestSeatCount()).toBe(100);
    process.env.GUEST_SEATS = 'abc'; expect(guestSeatCount()).toBe(5);
  });
  it('works for N=20: pads names, fills all seats, then reuses the longest-idle one', async () => {
    process.env.GUEST_SEATS = '20';
    const db = fakeDb();
    const claims = [];
    for (let i = 0; i < 20; i++) claims.push(await claimSeat(db, at(i * 1000)));
    expect(db.users).toHaveLength(20);
    expect(db.users[19].name).toBe('Guest 020');
    expect(claims.map((c) => c.user.guestSeat)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    seatOf(db, 13).lastActiveAt = at(-DAY);
    const next = await claimSeat(db, at(60_000));
    expect(next.user.guestSeat).toBe(13);
    expect(await findSeatByToken(claims[12].token, db, at(60_000))).toBeNull();
    expect(db.users).toHaveLength(20);
  });
});

describe('7-day purge', () => {
  it('wipes data, grade and token for seats idle more than 7 days and leaves active ones', async () => {
    const db = fakeDb();
    const old = await claimSeat(db, at(-8 * DAY));
    const fresh = await claimSeat(db, at(-1 * DAY));
    seatOf(db, 1).grade = 3;
    db.data.attempt.push({ userId: seatOf(db, 1).id }, { userId: seatOf(db, 2).id });
    db.data.mathSkillProgress.push({ userId: seatOf(db, 1).id });

    expect(await purgeExpired(db, T0)).toBe(1);
    expect(seatOf(db, 1)).toMatchObject({ grade: null, guestTokenHash: null, lastActiveAt: null });
    expect(db.data.attempt).toEqual([{ userId: seatOf(db, 2).id }]);
    expect(db.data.mathSkillProgress).toEqual([]);
    expect(await findSeatByToken(old.token, db, T0)).toBeNull();
    expect((await findSeatByToken(fresh.token, db, T0)).guestSeat).toBe(2);
    expect(await purgeExpired(db, T0)).toBe(0); // idempotent
  });

  it('is triggered lazily by a seat lookup and by session validation', async () => {
    const db = fakeDb();
    const c = await claimSeat(db, T0);
    const later = at(8 * DAY);
    expect(await validateGuestSession(seatOf(db, 1).id, hashToken(c.token), db, later)).toBe(false);
    expect(seatOf(db, 1).guestTokenHash).toBeNull();
  });
});

describe('sessions and activity', () => {
  it('a session only validates while the seat still holds its token', async () => {
    const db = fakeDb();
    const c = await claimSeat(db, T0);
    const id = seatOf(db, 1).id;
    expect(await validateGuestSession(id, hashToken(c.token), db, at(1000))).toBe(true);
    expect(await validateGuestSession(id, hashToken('someone-else'), db, at(1000))).toBe(false);
  });

  it('touchGuest updates lastActiveAt at most once a minute', async () => {
    const db = fakeDb();
    await claimSeat(db, T0);
    const id = seatOf(db, 1).id;
    expect(await touchGuest(db, id, at(10_000))).toBe(false); // claimed 10s ago: too soon
    expect(seatOf(db, 1).lastActiveAt).toEqual(T0);
    expect(await touchGuest(db, id, at(TOUCH_INTERVAL_MS + 5000))).toBe(true);
    expect(seatOf(db, 1).lastActiveAt).toEqual(at(TOUCH_INTERVAL_MS + 5000));
    expect(await touchGuest(db, id, at(TOUCH_INTERVAL_MS + 6000))).toBe(false);
  });
});

describe('cookieValue', () => {
  it('reads one cookie from a header', () => {
    expect(cookieValue('a=1; guest_seat=abc%2Bdef; b=2', 'guest_seat')).toBe('abc+def');
    expect(cookieValue('a=1', 'guest_seat')).toBeNull();
    expect(cookieValue(undefined, 'guest_seat')).toBeNull();
  });
  it('idle window constant is 7 days', () => expect(GUEST_IDLE_MS).toBe(7 * DAY));
});
