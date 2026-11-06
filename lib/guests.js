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
export const GUEST_COOKIE = 'guest_seat';
export const GUEST_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const GUEST_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // seconds
export const TOUCH_INTERVAL_MS = 60 * 1000;

export const seatName = (n) => `Guest ${String(n).padStart(3, '0')}`;
/** What kids see after "Cadet ": 003 */
export const seatLabel = (n) => String(n).padStart(3, '0');

export const newToken = () => crypto.randomBytes(32).toString('base64url');
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
 * A free seat (no token) wins, lowest number first; otherwise the longest-idle seat (oldest lastActiveAt, ties by number).
 * Returns { seat, reuse } or null when there are no seats.
 */
export function pickSeat(seats) {
  const list = [...seats].sort((a, b) => a.guestSeat - b.guestSeat);
  const free = list.find((s) => !s.guestTokenHash);
  if (free) return { seat: free, reuse: false };
  let best = null;
  for (const s of list) if (!best || time(s.lastActiveAt) < time(best.lastActiveAt)) best = s;
  return best ? { seat: best, reuse: true } : null;
}

const BLANK = { grade: null, level: 1, guestTokenHash: null, lastActiveAt: null, failedLoginAttempts: 0, lockedUntil: null };

/** Delete everything a seat's player did, reset the user row, and apply `patch` (e.g. a fresh token). One transaction. */
export async function wipeSeat(db, userId, patch = {}) {
  await db.$transaction([
    db.attempt.deleteMany({ where: { userId } }),
    db.test.deleteMany({ where: { userId } }),
    db.spellingAttempt.deleteMany({ where: { userId } }),
    db.mathAttempt.deleteMany({ where: { userId } }),
    db.mathSkillProgress.deleteMany({ where: { userId } }),
    db.userProblem.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { ...BLANK, ...patch } }),
  ]);
}

/** Make sure the five seat rows exist (idempotent). */
export async function ensureSeats(db = prisma) {
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
  for (const s of stale) await wipeSeat(db, s.id);
  return stale.length;
}

/**
 * Give a device a seat. Free seat first; if all five are taken, the longest-idle one is wiped and its token rotated
 * (whoever held it loses access). Returns { user, token } - the raw token goes into the httpOnly cookie, never the DB.
 */
export async function claimSeat(db = prisma, now = new Date()) {
  await ensureSeats(db);
  await purgeExpired(db, now);
  for (let attempt = 0; attempt < 5; attempt++) {
    const seats = await db.user.findMany({ where: { isGuest: true, guestSeat: { lte: guestSeatCount() } }, select: seatSelect });
    const pick = pickSeat(seats);
    if (!pick) throw new Error('No guest seats');
    const token = newToken();
    const patch = { guestTokenHash: hashToken(token), lastActiveAt: now };
    if (pick.reuse) {
      await wipeSeat(db, pick.seat.id, patch);
    } else {
      // compare-and-set so two devices cannot both take the same free seat
      const r = await db.user.updateMany({ where: { id: pick.seat.id, guestTokenHash: null }, data: patch });
      if (r.count !== 1) continue;
    }
    const user = await db.user.findUnique({ where: { id: pick.seat.id } });
    return { user, token };
  }
  throw new Error('Could not claim a guest seat');
}

/** The seat this secret belongs to, or null (unknown, rotated, or expired and wiped). Purges first. */
export async function findSeatByToken(token, db = prisma, now = new Date()) {
  if (!token) return null;
  await purgeExpired(db, now);
  return db.user.findFirst({ where: { isGuest: true, guestTokenHash: hashToken(token) } });
}

/** A device that asks for a "new guest" gives up its old seat: wipe it so the seat frees up. */
export async function releaseByToken(token, db = prisma, now = new Date()) {
  const seat = await findSeatByToken(token, db, now);
  if (seat) await wipeSeat(db, seat.id);
  return !!seat;
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
  await purgeExpired(db, now);
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
