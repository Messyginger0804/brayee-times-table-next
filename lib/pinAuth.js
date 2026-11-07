import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { hit } from './rateLimit';
import { isSchemaMissing, MAINTENANCE_MESSAGE } from './dbErrors';
import { normalizeName, isValidStudentId, STUDENT_ID_MIN, STUDENT_ID_MAX } from './cadetNames';
import { purgeInactiveSaved } from './savedCadetPurge';

// Used for every sign-in: the student ID (5-8 digits) of Braylee and of saved cadets. It lives in User.pin as
// bcrypt(HMAC-SHA256(pepper, secret)): the pepper is derived from NEXTAUTH_SECRET (HKDF, fixed label), so a stolen database alone cannot be brute
// forced over the possible values. Rows hashed before the pepper (plain bcrypt) and legacy plaintext rows still verify and are
// upgraded on the next successful sign-in. Rotating NEXTAUTH_SECRET therefore invalidates every PIN and ID (see the runbook).
// Kid-friendly lockout with escalating rests. Stored in User.failedLoginAttempts / lockedUntil.
// Every attempt first claims a slot with ONE conditional UPDATE (fails + 1, and the lock is set in the same statement),
// so parallel requests cannot all test a PIN before the first lock is written. A correct PIN resets the counter.
//   5-9 wrong in a row -> 1 minute, 10-14 -> 5 minutes, 15-19 -> 30 minutes, 20-24 -> 2 hours, 25+ -> 24 hours (re-applied on every further wrong try).
// Every failure looks the same to the caller (unknown name, wrong secret, resting account): same status, same message, same bcrypt work.
export const MAX_FAILS = 5;
const LOCK_STEPS = [[25, 86400], [20, 7200], [15, 1800], [10, 300], [5, 60]]; // [fails, seconds]; mirrored in the SQL CASE below
export function cooldownFor(fails) {
  return LOCK_STEPS.find(([n]) => fails >= n)?.[1] ?? 0;
}
const BCRYPT_ROUNDS = 10; // prod rows are $2b$ hashes; bcryptjs verifies them

// Best-effort per-IP limit (per server instance, see lib/rateLimit.js)
const IP_LOGIN_LIMIT = 30;
const IP_LOGIN_WINDOW_MS = 10 * 60 * 1000;

export const isHashed = (pin) => typeof pin === 'string' && /^\$2[aby]\$/.test(pin);

/** HMAC-SHA256(pepper, secret) as base64 (44 chars, well inside bcrypt's 72-byte limit). The pepper never leaves the server. */
function pepper(pin) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required to hash PINs');
  const key = Buffer.from(crypto.hkdfSync('sha256', secret, '', 'pin-pepper-v1', 32));
  return crypto.createHmac('sha256', key).update(String(pin)).digest('base64');
}
export const hashPin = async (pin) => bcrypt.hash(pepper(pin), BCRYPT_ROUNDS);

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
  await bcrypt.compare(pepper(pin), dummyHash); // a real wrong secret costs two compares (peppered, then legacy): so does this
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
                 WHEN "failedLoginAttempts" + 1 >= 25 THEN 86400
                 WHEN "failedLoginAttempts" + 1 >= 20 THEN 7200
                 WHEN "failedLoginAttempts" + 1 >= 15 THEN 1800
                 WHEN "failedLoginAttempts" + 1 >= 10 THEN 300
                 ELSE 60 END))
          ELSE NULL END
    WHERE id = ${id}
      AND ("lockedUntil" IS NULL OR "lockedUntil" <= (now() AT TIME ZONE 'UTC'))
    RETURNING "failedLoginAttempts" AS fails`;
  return rows.length ? Number(rows[0].fails) : null;
}

export const FAIL_MESSAGE = "That didn't work. Check your name and student ID, or try again in a little while.";
const INVALID = { ok: false, status: 401, error: FAIL_MESSAGE };

/** { match, upgrade }: peppered hash first, then plain bcrypt, then legacy plaintext. `upgrade` = stored in an older format, rehash on success. */
async function pinMatches(user, pin) {
  if (!user.pin) return { match: false };
  if (!isHashed(user.pin)) return { match: user.pin === pin, upgrade: true };
  if (await bcrypt.compare(pepper(pin), user.pin)) return { match: true, upgrade: false };
  return { match: await bcrypt.compare(pin, user.pin), upgrade: true };
}

// Rehashing writes a new hash made with THIS process's pepper, so only the production deployment (whose NEXTAUTH_SECRET produced, or will produce,
// the real hashes) may do it. A preview or a laptop pointed at the prod DB with another secret would otherwise rewrite Braylee's hash under the
// wrong key and lock her out. PIN_REHASH=1 opts in for local testing. Everywhere else sign-in only verifies.
const canRehash = () => process.env.VERCEL_ENV === 'production' || process.env.PIN_REHASH === '1';

// Successful login: clear the fail counter / lock and rehash a PIN stored as plaintext or without the pepper.
async function recordSuccess(user, pin, upgrade) {
  const data = { failedLoginAttempts: 0, lockedUntil: null };
  if (upgrade && canRehash()) data.pin = await hashPin(pin);
  if (user.savedCadet) data.lastActiveAt = new Date(); // a saved cadet signing in counts as activity (retention clock)
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return { ok: true, user: updated };
}

function ipLimited(ip) {
  if (!ip) return null;
  const l = hit(`login:${ip}`, IP_LOGIN_LIMIT, IP_LOGIN_WINDOW_MS);
  if (l.ok) return null;
  return { ok: false, status: 429, error: lockMessage(l.retryAfter), retryAfter: l.retryAfter };
}

// Exact name first (Braylee, legacy rows); otherwise a case-insensitive match, but only when it is unambiguous ("luna" finds "Luna").
async function findByName(name) {
  const exact = await prisma.user.findUnique({ where: { name } });
  if (exact) return exact;
  const near = await prisma.user.findMany({ where: { name: { equals: name, mode: 'insensitive' } }, take: 2 });
  return near.length === 1 ? near[0] : null;
}

async function checkCredentials(name, pin) {
  await purgeInactiveSaved(prisma); // lazy retention: a saved cadet idle past the limit is gone before they can sign in
  const user = await findByName(name);
  if (!user || user.isGuest) { await burnTime(pin); return { ...INVALID }; } // guest seats have no PIN and can never be typed into

  if ((await claimAttempt(user.id)) === null) { await burnTime(pin); return { ...INVALID }; } // resting: same answer, same cost

  const m = await pinMatches(user, pin);
  return m.match ? recordSuccess(user, pin, m.upgrade) : { ...INVALID };
}

/**
 * Check name + student ID (5-8 digits).
 * Returns { ok: true, user } or { ok: false, status, error, retryAfter? } (retryAfter only for the per-IP limit).
 * status 503 means the database is behind the code (migrations not applied yet).
 * Legacy plaintext and un-peppered rows are accepted once and upgraded to a peppered bcrypt hash.
 */
export async function verifyPin(rawName, rawPin, { ip } = {}) {
  const name = normalizeName(rawName);
  const pin = String(rawPin || '');
  if (!name || !isValidStudentId(pin)) {
    return { ok: false, status: 400, error: `Name and your student ID (${STUDENT_ID_MIN} to ${STUDENT_ID_MAX} digits) required` };
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
