import { NextResponse } from 'next/server';
import { prisma } from './prisma';

// Every write keyed to a user id goes through here. For a guest session (actor.gk = the seat's token hash) the write runs in a
// transaction that first takes a row-level share lock on the seat while checking the token still matches:
//   SELECT 1 FROM "User" WHERE id = $1 AND "guestTokenHash" = $2 FOR SHARE
// A wipe (lib/guests.js wipeSeat) updates that same row first, so the two conflict: either the wipe waits for this write and then
// deletes what it wrote, or this write waits for the wipe, sees the rotated/cleared token, and aborts. A write can therefore never
// land after a wipe and leave rows behind for the next player. Real (non-guest) accounts have no gk and skip the check.
export class SeatLostError extends Error {
  constructor() { super('Guest seat no longer belongs to this session'); this.name = 'SeatLostError'; }
}

const TX_OPTIONS = { timeout: 15000 };

/** Run `fn(tx)` as the actor { id, gk? }. Throws SeatLostError when a guest session lost its seat. */
export async function writeAs(actor, fn, db = prisma) {
  return db.$transaction(async (tx) => {
    if (actor.gk) {
      const rows = await tx.$queryRaw`SELECT 1 AS ok FROM "User" WHERE id = ${actor.id} AND "guestTokenHash" = ${actor.gk} FOR SHARE`;
      if (!rows.length) throw new SeatLostError();
    }
    return fn(tx);
  }, TX_OPTIONS);
}

/** Like writeAs, but a lost seat becomes a 401 response: returns { value } or { lost: Response }. */
export async function guestSafe(actor, fn, db = prisma) {
  try {
    return { value: await writeAs(actor, fn, db) };
  } catch (e) {
    if (e instanceof SeatLostError) return { lost: NextResponse.json({ error: 'Not logged in' }, { status: 401 }) };
    throw e;
  }
}
