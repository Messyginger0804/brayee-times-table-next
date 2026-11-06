import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { hit } from './rateLimit';
import { isSchemaMissing, MAINTENANCE_MESSAGE } from './dbErrors';

// Kid-friendly lockout with escalating rests. Stored in User.failedLoginAttempts / lockedUntil.
// Every attempt first claims a slot with ONE conditional UPDATE (fails + 1, and the lock is set in the same statement),
// so parallel requests cannot all test a PIN before the first lock is written. A correct PIN resets the counter.
//   5-9 wrong in a row -> 1 minute, 10-14 -> 5 minutes, 15+ -> 30 minutes (re-applied on every further wrong PIN).
export const MAX_FAILS = 5;
const COOLDOWN_SECONDS = 60; // first rest
export function cooldownFor(fails) {
  if (fails < MAX_FAILS) return 0;
  if (fails < 10) return COOLDOWN_SECONDS;
  if (fails < 15) return 5 * 60;
  return 30 * 60;
}
const BCRYPT_ROUNDS = 10; // prod rows are $2b$ hashes; bcryptjs verifies them

// Best-effort per-IP limit (per server instance, see lib/rateLimit.js)
const IP_LOGIN_LIMIT = 30;
const IP_LOGIN_WINDOW_MS = 10 * 60 * 1000;

export const isHashed = (pin) => typeof pin === 'string' && /^\$2[aby]\$/.test(pin);
export const hashPin = (pin) => bcrypt.hash(String(pin), BCRYPT_ROUNDS);

export const lockMessage = (seconds) => {
  if (seconds >= 120) {
    const m = Math.ceil(seconds / 60);
    return `Let's take a short break! Try again in ${m} minutes.`;
  }
  return `Let's take a short break! Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`;
};

let dummyHash = null; // so unknown names cost the same bcrypt time as real ones
const burnTime = async (pin) => {
  dummyHash = dummyHash || (await bcrypt.hash('0000', BCRYPT_ROUNDS));
  await bcrypt.compare(pin, dummyHash);
};

/**
 * Atomically claim one attempt for the user. Returns the new failure count, or null when the account is resting.
 * The WHERE clause checks the lock and the SET applies the next one, in a single statement (row-locked by Postgres).
 */
async function claimAttempt(id) {
  const rows = await prisma.$queryRaw`
    UPDATE "User"
    SET "failedLoginAttempts" = "failedLoginAttempts" + 1,
        "lockedUntil" = CASE
          WHEN "failedLoginAttempts" + 1 >= ${MAX_FAILS}
          THEN (now() AT TIME ZONE 'UTC') + make_interval(secs => (CASE
                 WHEN "failedLoginAttempts" + 1 >= 15 THEN 1800
                 WHEN "failedLoginAttempts" + 1 >= 10 THEN 300
                 ELSE ${COOLDOWN_SECONDS} END))
          ELSE NULL END
    WHERE id = ${id}
      AND ("lockedUntil" IS NULL OR "lockedUntil" <= (now() AT TIME ZONE 'UTC'))
    RETURNING "failedLoginAttempts" AS fails`;
  return rows.length ? Number(rows[0].fails) : null;
}

const resting = async (id) => {
  const u = await prisma.user.findUnique({ where: { id }, select: { lockedUntil: true } });
  const retryAfter = Math.max(1, Math.ceil(((u?.lockedUntil?.getTime() ?? 0) - Date.now()) / 1000));
  return { ok: false, status: 429, error: lockMessage(retryAfter), retryAfter };
};

const INVALID = { ok: false, status: 401, error: 'Invalid name or PIN' };

const pinMatches = async (user, pin) => {
  if (!user.pin) return false;
  return isHashed(user.pin) ? bcrypt.compare(pin, user.pin) : user.pin === pin;
};

// Successful login: clear the fail counter / lock and upgrade a legacy plaintext PIN.
async function recordSuccess(user, pin) {
  const data = { failedLoginAttempts: 0, lockedUntil: null };
  if (!isHashed(user.pin)) data.pin = await hashPin(pin); // upgrade legacy plaintext
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return { ok: true, user: updated };
}

// Wrong PIN: the attempt was already counted by claimAttempt; report the rest it started, if any.
function failureResult(fails) {
  const wait = cooldownFor(fails);
  if (wait > 0) return { ok: false, status: 429, error: lockMessage(wait), retryAfter: wait };
  return { ...INVALID };
}

function ipLimited(ip) {
  if (!ip) return null;
  const l = hit(`login:${ip}`, IP_LOGIN_LIMIT, IP_LOGIN_WINDOW_MS);
  if (l.ok) return null;
  return { ok: false, status: 429, error: lockMessage(l.retryAfter), retryAfter: l.retryAfter };
}

async function checkCredentials(name, pin) {
  const user = await prisma.user.findUnique({ where: { name } });
  if (!user || user.isGuest) { await burnTime(pin); return { ...INVALID }; } // guest seats have no PIN and can never be typed into

  const fails = await claimAttempt(user.id);
  if (fails === null) return resting(user.id);

  if (await pinMatches(user, pin)) return recordSuccess(user, pin);
  return failureResult(fails);
}

/**
 * Check name + PIN.
 * Returns { ok: true, user } or { ok: false, status, error, retryAfter? }.
 * status 503 means the database is behind the code (migrations not applied yet).
 * Legacy rows that still hold a plaintext PIN are accepted once and upgraded to a bcrypt hash.
 */
export async function verifyPin(rawName, rawPin, { ip } = {}) {
  const name = String(rawName || '').trim();
  const pin = String(rawPin || '');
  if (!name || !/^\d{4}$/.test(pin)) {
    return { ok: false, status: 400, error: 'Name and a 4-digit PIN required' };
  }
  const limited = ipLimited(ip);
  if (limited) return limited;
  try {
    return await checkCredentials(name, pin);
  } catch (e) {
    if (isSchemaMissing(e)) return { ok: false, status: 503, error: MAINTENANCE_MESSAGE, maintenance: true };
    throw e;
  }
}
