import crypto from 'crypto';

// "Trusted device" cookie (OWASP device-cookie pattern), so an attacker hammering the only real account cannot lock the
// owner out of a browser that already logged in.
//   token = base64url(userId.nonce.issuedAtMs) + '.' + HMAC-SHA256(derivedKey, payload)
// Derived key = HMAC(NEXTAUTH_SECRET, 'device-trust-v1'); without NEXTAUTH_SECRET the feature is off (nothing is trusted).
// Per-device failure counting and revocation are IN MEMORY (no schema change), so they are per server instance and reset
// on a cold start. A revoked/failed device simply falls back to the normal database-backed account lockout.
export const DEVICE_COOKIE = 'device_trust';
export const DEVICE_MAX_AGE_S = 90 * 24 * 60 * 60;
const DEVICE_MAX_FAILS = 5;
const DEVICE_COOLDOWN_S = 15 * 60;
const MAX_TRACKED = 1000;

export const deviceCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: DEVICE_MAX_AGE_S,
};

const key = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  return secret ? crypto.createHmac('sha256', secret).update('device-trust-v1').digest() : null;
};
const sign = (k, payload) => crypto.createHmac('sha256', k).update(payload).digest('base64url');

/** New signed token for this user, or null when no secret is configured. */
export function signDevice(userId, now = Date.now()) {
  const k = key();
  if (!k) return null;
  const payload = Buffer.from(`${userId}.${crypto.randomBytes(16).toString('base64url')}.${now}`).toString('base64url');
  return `${payload}.${sign(k, payload)}`;
}

const failures = new Map(); // nonce -> { count, lockedUntil }
const revoked = new Set();

/** Returns { nonce } for a genuine, unexpired, unrevoked cookie issued to `userId`; otherwise null. */
export function verifyDevice(token, userId, now = Date.now()) {
  const k = key();
  if (!k || typeof token !== 'string') return null;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra !== undefined) return null;
  const want = Buffer.from(sign(k, payload));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  const [uid, nonce, iat] = Buffer.from(payload, 'base64url').toString().split('.');
  const issued = Number(iat);
  if (String(uid) !== String(userId) || !nonce || !Number.isFinite(issued)) return null;
  if (issued > now + 60_000 || now - issued > DEVICE_MAX_AGE_S * 1000) return null;
  if (revoked.has(nonce)) return null;
  return { nonce };
}

/** Seconds this device must rest (0 = free to try). */
export function deviceRetryAfter(nonce, now = Date.now()) {
  const f = failures.get(nonce);
  return f?.lockedUntil > now ? Math.ceil((f.lockedUntil - now) / 1000) : 0;
}

/** Record a wrong PIN. On the 5th the device rests 15 minutes and the cookie is revoked. Returns { revoked, retryAfter }. */
export function deviceFailed(nonce, now = Date.now()) {
  let f = failures.get(nonce);
  if (!f) {
    while (failures.size >= MAX_TRACKED) failures.delete(failures.keys().next().value);
    f = { count: 0, lockedUntil: 0 };
    failures.set(nonce, f);
  }
  f.count += 1;
  if (f.count >= DEVICE_MAX_FAILS) {
    f.lockedUntil = now + DEVICE_COOLDOWN_S * 1000;
    revoked.add(nonce);
    if (revoked.size > MAX_TRACKED * 10) revoked.delete(revoked.values().next().value);
    return { revoked: true, retryAfter: DEVICE_COOLDOWN_S };
  }
  return { revoked: false, retryAfter: 0 };
}

export const deviceSucceeded = (nonce) => { failures.delete(nonce); };
export const _resetDevices = () => { failures.clear(); revoked.clear(); };
