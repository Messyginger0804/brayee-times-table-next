import crypto from 'crypto';
import { prisma } from './prisma';

// Guest seats: the only way to play without Braylee's real account.
// GUEST_SEATS (default 5) User rows (Guest 001, 002, ..., isGuest = true) are handed out to anonymous devices. A device proves it owns a seat
// with a random secret in an httpOnly cookie; only the sha256 of that secret is stored (User.guestTokenHash).
// A seat with guestTokenHash = null is free. Seats idle for 7 days are wiped (attempts, progress, grade) and freed.

/** Number of guest seats: env GUEST_SEATS, default 5, clamped to 1-100. The only place it is read. */
export function guestSeatCount() {
  const n = Number.parseInt(process.env.GUEST_SEATS ?? '', 10);
  if (!Number.isFinite(n)) return 5;
  return Math.min(100, Math.max(1, n));
}
/** Minimum idle time before a taken seat may be reused for a new device: env GUEST_MIN_IDLE_MINUTES, default 15. */
export function guestMinIdleMs() {
  const n = Number.parseFloat(process.env.GUEST_MIN_IDLE_MINUTES ?? '');
  return (Number.isFinite(n) && n >= 0 ? Math.min(n, 7 * 24 * 60) : 15) * 60 * 1000;
}
const SEATS_BUSY_MESSAGE = 'All seats are busy, try again in a few minutes 🚀';
export class SeatsBusyError extends Error {
  constructor() { super(SEATS_BUSY_MESSAGE); this.name = 'SeatsBusyError'; this.busy = true; }
}
export const GUEST_COOKIE = 'guest_seat';
export const GUEST_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const GUEST_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // seconds
export const TOUCH_INTERVAL_MS = 60 * 1000;

const seatName = (n) => `Guest ${String(n).padStart(3, '0')}`;
/** What kids see after "Cadet ": 003 */
export const seatLabel = (n) => String(n).padStart(3, '0');

const newToken = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

export const guestCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: GUEST_COOKIE_MAX_AGE,
};

const time = (d) => (d ? new Date(d).getTime() : 0);

/** A claimed seat whose last activity is more than 7 days old (a claimed seat with no timestamp counts as expired). */
export function isExpired(seat, now = new Date()) {
  if (!seat?.guestTokenHash) return false;
  return now.getTime() - time(seat.lastActiveAt) > GUEST_IDLE_MS;
}

/**
 * Pure seat allocation. seats: [{ guestSeat, guestTokenHash, lastActiveAt }].
 * A free seat (no token) wins, lowest number first. Otherwise only a seat idle for at least `minIdleMs` may be reused,
 * the longest-idle first (oldest lastActiveAt, ties by number). A seat with no timestamp counts as idle.
 * Returns { seat, reuse } or null when there is no free seat and nothing has been idle long enough (or no seats at all).
 */
export function pickSeat(seats, now = new Date(), minIdleMs = guestMinIdleMs()) {
  const list = [...seats].sort((a, b) => a.guestSeat - b.guestSeat);
  const free = list.find((s) => !s.guestTokenHash);
  if (free) return { seat: free, reuse: false };
  let best = null;
  for (const s of list) {
    if (s.lastActiveAt && now.getTime() - time(s.lastActiveAt) < minIdleMs) continue;
    if (!best || time(s.lastActiveAt) < time(best.lastActiveAt)) best = s;
  }
  return best ? { seat: best, reuse: true } : null;
}

const BLANK = { grade: null, level: 1, guestTokenHash: null, lastActiveAt: null, failedLoginAttempts: 0, lockedUntil: null };

const SEAT_TABLES = ['attempt', 'test', 'spellingAttempt', 'mathAttempt', 'mathSkillProgress', 'userProblem', 'skillUnlock'];

/**
 * Wipe a seat: reset the user row (token rotation via `patch`) and delete everything its player did, in ONE interactive
 * transaction, so a failure part-way leaves the old owner's data AND token untouched (never a freed or re-tokened seat that
 * still holds someone's history). `guard` is REQUIRED (it must include guestTokenHash): the row update is a compare-and-set that
 * is evaluated inside the transaction, and if the row no longer matches nothing is changed and false is returned. The row
 * update comes first, so its lock excludes in-flight guest writes (see lib/guestWrite.js).
 */
export async function wipeSeat(db, userId, patch, guard) {
  if (!guard || !('guestTokenHash' in guard)) throw new Error('wipeSeat requires a guestTokenHash guard');
  return db.$transaction(async (tx) => {
    const r = await tx.user.updateMany({ where: { id: userId, ...guard }, data: { ...BLANK, ...patch } });
    if (r.count !== 1) return false;
    for (const t of SEAT_TABLES) await tx[t].deleteMany({ where: { userId } });
    return true;
  }, { timeout: 15000 });
}

/** Make sure the five seat rows exist (idempotent). */
async function ensureSeats(db = prisma) {
  const data = Array.from({ length: guestSeatCount() }, (_, i) => ({ name: seatName(i + 1), isGuest: true, guestSeat: i + 1 }));
  await db.user.createMany({ data, skipDuplicates: true });
}

const seatSelect = { id: true, guestSeat: true, guestTokenHash: true, lastActiveAt: true };

/** Wipe and free every guest seat idle for more than 7 days. Returns the number purged. Runs lazily on seat requests. */
export async function purgeExpired(db = prisma, now = new Date()) {
  const cutoff = new Date(now.getTime() - GUEST_IDLE_MS);
  const stale = await db.user.findMany({
    where: { isGuest: true, guestTokenHash: { not: null }, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoff } }] },
    select: seatSelect,
  });
  let n = 0;
  for (const s of stale) if (await wipeSeat(db, s.id, {}, { guestTokenHash: s.guestTokenHash, lastActiveAt: s.lastActiveAt })) n++;
  return n;
}

/** Lazy purge for request paths: best effort, a failing purge is logged and never breaks the caller's request. */
async function purgeExpiredQuietly(db, now) {
  try { await purgeExpired(db, now); } catch (e) { console.error('guest purge failed', e); }
}

/**
 * Give a device a seat. Free seat first; if all are taken, the longest-idle one is wiped and its token rotated
 * (whoever held it loses access) - but only if it has been idle for GUEST_MIN_IDLE_MINUTES. Otherwise throws SeatsBusyError.
 * Both paths are compare-and-set on the seat's current token hash. Returns { user, token } - the raw token goes into the httpOnly cookie, never the DB.
 */
export async function claimSeat(db = prisma, now = new Date()) {
  await ensureSeats(db);
  await purgeExpiredQuietly(db, now);
  for (let attempt = 0; attempt < 5; attempt++) {
    const seats = await db.user.findMany({ where: { isGuest: true, guestSeat: { lte: guestSeatCount() } }, select: seatSelect });
    if (!seats.length) throw new Error('No guest seats');
    const pick = pickSeat(seats, now);
    if (!pick) throw new SeatsBusyError();
    const token = newToken();
    const patch = { guestTokenHash: hashToken(token), lastActiveAt: now };
    if (pick.reuse) {
      const ok = await wipeSeat(db, pick.seat.id, patch, { guestTokenHash: pick.seat.guestTokenHash, lastActiveAt: pick.seat.lastActiveAt });
      if (!ok) continue; // someone else took or touched it: look again
    } else {
      // compare-and-set so two devices cannot both take the same free seat
      const r = await db.user.updateMany({ where: { id: pick.seat.id, guestTokenHash: null }, data: patch });
      if (r.count !== 1) continue;
    }
    const user = await db.user.findUnique({ where: { id: pick.seat.id } });
    return { user, token };
  }
  throw new SeatsBusyError(); // kept losing races: everything is in motion, ask them to retry
}

/** The seat this secret belongs to, or null (unknown, rotated, or expired and wiped). Purges first. */
export async function findSeatByToken(token, db = prisma, now = new Date()) {
  if (!token) return null;
  await purgeExpiredQuietly(db, now);
  return db.user.findFirst({ where: { isGuest: true, guestTokenHash: hashToken(token) } });
}

/**
 * A device that asks for a "new guest" gives up its old seat: wipe it so the seat frees up. The caller proves ownership by
 * holding the token, so the compare-and-set is on guestTokenHash only (lastActiveAt moves under a playing kid and must not
 * make the release fail). Returns true when the seat was wiped, false when there was none or it changed hands first.
 */
export async function releaseByToken(token, db = prisma, now = new Date()) {
  const seat = await findSeatByToken(token, db, now);
  if (!seat) return false;
  return wipeSeat(db, seat.id, {}, { guestTokenHash: seat.guestTokenHash });
}

/**
 * Make sure this device holds no seat, so it can never end up with two. Retries the release once. Returns true when the device
 * has no seat afterwards, false when one is still there (the caller should answer "try again" and claim nothing).
 */
export async function releaseDeviceSeat(token, db = prisma, now = new Date()) {
  if (!token) return true;
  for (let i = 0; i < 2; i++) {
    if (await releaseByToken(token, db, now)) return true;
    if (!(await findSeatByToken(token, db, now))) return true; // nothing there, or it already changed hands
  }
  return false;
}

const lastTouch = new Map(); // userId -> ms; keeps most requests from touching the DB

/** Bump lastActiveAt, at most once a minute per seat. */
export async function touchGuest(db, userId, now = new Date(), force = false) {
  const last = lastTouch.get(userId) || 0;
  if (!force && now.getTime() - last < TOUCH_INTERVAL_MS) return false;
  const r = await db.user.updateMany({
    where: { id: userId, isGuest: true, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(now.getTime() - TOUCH_INTERVAL_MS) } }] },
    data: { lastActiveAt: now },
  });
  if (r.count > 0) lastTouch.set(userId, now.getTime());
  return r.count > 0;
}

export const _resetTouchCache = () => lastTouch.clear();

/**
 * Is this signed-in guest session (JWT carries the seat's token hash) still the owner of the seat?
 * False if the seat was purged, rotated or reassigned. Also purges lazily and refreshes lastActiveAt.
 */
export async function validateGuestSession(userId, tokenHash, db = prisma, now = new Date()) {
  await purgeExpiredQuietly(db, now);
  const u = await db.user.findUnique({ where: { id: userId }, select: { isGuest: true, guestTokenHash: true } });
  if (!u?.isGuest || !u.guestTokenHash || u.guestTokenHash !== tokenHash) return false;
  await touchGuest(db, userId, now);
  return true;
}

export function cookieValue(header, name) {
  if (!header) return null;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
