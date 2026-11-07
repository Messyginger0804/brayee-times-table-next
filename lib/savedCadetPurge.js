import { prisma } from './prisma';
import { SEAT_TABLES, TOUCH_INTERVAL_MS } from './guests';
import { isSchemaMissing } from './dbErrors';

// Retention for saved cadets (see lib/savedCadets.js): a saved cadet is deleted with all its data after SAVED_CADET_RETENTION_DAYS without
// activity (User.lastActiveAt). Braylee is never purged. Kept apart from savedCadets.js so lib/pinAuth.js can purge lazily without an import cycle.

const DAY_MS = 24 * 60 * 60 * 1000;
const BRAYLEE = 'Braylee';
const LAZY_PURGE_EVERY_MS = 5 * 60 * 1000;

const intEnv = (name, fallback, min, max) => {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
/** Max saved cadets: env SAVED_CADETS_MAX, default 10, clamped 0-500. */
export const savedCadetsMax = () => intEnv('SAVED_CADETS_MAX', 10, 0, 500);
/** Days without activity before a saved cadet is deleted: env SAVED_CADET_RETENTION_DAYS, default 30, clamped 1-3650. */
export const retentionDays = () => intEnv('SAVED_CADET_RETENTION_DAYS', 30, 1, 3650);

const lastActivity = (u) => u.lastActiveAt ?? u.savedAt;
const isStale = (u, cutoff) => { const t = lastActivity(u); return !t || t < cutoff; };

/** Delete one saved cadet and everything they did, in one transaction. False when they were active again (or already gone). */
async function deleteSavedCadet(db, u) {
  return db.$transaction(async (tx) => {
    // Row lock + compare-and-set on lastActiveAt: a cadet who just played is kept. FOR UPDATE conflicts with the KEY SHARE lock a child-row
    // insert takes, so a write racing this delete waits for it and then fails on the missing user, instead of leaving an orphan row.
    const locked = await tx.$queryRaw`SELECT 1 AS ok FROM "User" WHERE id = ${u.id} AND "savedCadet" = true AND name <> ${BRAYLEE} AND "lastActiveAt" IS NOT DISTINCT FROM ${u.lastActiveAt}::timestamp FOR UPDATE`;
    if (!locked.length) return false;
    for (const t of [...SEAT_TABLES, 'account', 'session']) await tx[t].deleteMany({ where: { userId: u.id } });
    await tx.user.delete({ where: { id: u.id } });
    return true;
  }, { timeout: 15000 });
}

/** Fully delete saved cadets idle for more than SAVED_CADET_RETENTION_DAYS. Returns how many. Never touches Braylee or guest seats. */
export async function purgeInactiveSaved(db = prisma, now = new Date()) {
  const cutoff = new Date(now.getTime() - retentionDays() * DAY_MS);
  const all = await db.user.findMany({ where: { savedCadet: true }, select: { id: true, name: true, lastActiveAt: true, savedAt: true } }); // at most SAVED_CADETS_MAX rows
  let n = 0;
  for (const u of all.filter((x) => x.name !== BRAYLEE && isStale(x, cutoff))) {
    try {
      if (await deleteSavedCadet(db, u)) n++;
    } catch (e) {
      if (isSchemaMissing(e)) throw e;
      console.error(`[saved-purge] failed ${e?.code ?? 'error'}`); // code only: no names, no data
    }
  }
  return n;
}

const lastTouch = new Map(); // userId -> ms
let lastPurge = 0;
export const _resetSavedCache = () => { lastTouch.clear(); lastPurge = 0; };

/** Is this saved-cadet session (JWT flag `sc`) still a live saved cadet? Purges stale ones lazily (every few minutes) and bumps lastActiveAt (once a minute). */
export async function validateSavedSession(userId, db = prisma, now = new Date()) {
  if (now.getTime() - lastPurge >= LAZY_PURGE_EVERY_MS) { lastPurge = now.getTime(); await purgeInactiveSaved(db, now); }
  const u = await db.user.findUnique({ where: { id: userId }, select: { savedCadet: true } });
  if (!u?.savedCadet) return false;
  if (now.getTime() - (lastTouch.get(userId) || 0) >= TOUCH_INTERVAL_MS) {
    await db.user.updateMany({
      where: { id: userId, savedCadet: true, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(now.getTime() - TOUCH_INTERVAL_MS) } }] },
      data: { lastActiveAt: now },
    });
    lastTouch.set(userId, now.getTime());
  }
  return true;
}
