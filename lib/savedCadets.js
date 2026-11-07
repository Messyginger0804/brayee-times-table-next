import { hashPin } from './pinAuth';
import { ensureSeats } from './guests';
import { purgeInactiveSaved, savedCadetsMax } from './savedCadetPurge';

// Saved cadets: a guest seat that a kid turned into a named account. The seat row itself becomes the account (so progress stays),
// `pin` holds the bcrypt hash of the 5-digit student ID, and a fresh empty guest seat takes its place in the pool.
// At most SAVED_CADETS_MAX of them exist (Braylee does not count: she is not flagged savedCadet). Retention lives in lib/savedCadetPurge.js.

const LOCK_KEY = 74120531; // pg_advisory_xact_lock key: serialises saves, so the cap and name checks cannot race

export const fullMessage = () => `All ${savedCadetsMax()} saved cadet spots are taken right now. You can still play as a guest! 🚀`;

export class SavedCadetError extends Error {
  constructor(code, message) { super(message); this.name = 'SavedCadetError'; this.code = code; }
}

/**
 * Turn the guest seat `actor` ({ id, gk }) into a saved cadet. `name` is already validated (lib/cadetNames.js), `secret` is the raw
 * student ID: it is hashed here and goes nowhere else. Throws SavedCadetError('full' | 'taken' | 'seat').
 * Everything runs in one transaction behind an advisory lock. The seat row is updated with a compare-and-set on its token hash, the same
 * row lock lib/guestWrite.js uses, so an in-flight guest write either finishes first or is rejected, never orphaned.
 */
export async function saveCadet(db, actor, name, secret, now = new Date()) {
  const pin = await hashPin(secret);
  await purgeInactiveSaved(db, now); // frees spots held by long-idle cadets before we count
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      if ((await tx.user.count({ where: { savedCadet: true } })) >= savedCadetsMax()) throw new SavedCadetError('full', fullMessage());
      const clash = await tx.user.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
      if (clash) throw new SavedCadetError('taken', 'Someone already has that name. Pick another one!');
      const r = await tx.user.updateMany({
        where: { id: actor.id, isGuest: true, guestTokenHash: actor.gk },
        data: {
          name, pin, isGuest: false, guestSeat: null, guestTokenHash: null, savedCadet: true, savedAt: now, lastActiveAt: now,
          failedLoginAttempts: 0, lockedUntil: null,
        },
      });
      if (r.count !== 1) throw new SavedCadetError('seat', 'Not logged in');
      await ensureSeats(tx); // the converted seat's number is free again: create the empty guest seat
      return { name };
    }, { timeout: 15000 });
  } catch (e) {
    if (e?.code === 'P2002') throw new SavedCadetError('taken', 'Someone already has that name. Pick another one!');
    throw e;
  }
}

