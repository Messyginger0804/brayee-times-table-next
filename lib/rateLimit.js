// Best-effort fixed-window rate limiter. In-memory, so it is PER SERVER INSTANCE (serverless instances do not share it):
// it slows down a script hammering one instance, it is not a global guarantee. The per-account lockout in
// lib/pinAuth.js is the real protection and lives in the database.
const buckets = new Map(); // key -> { count, resetAt }
const MAX_KEYS = 5000;

/** Count one hit for `key`. Returns { ok, retryAfter } (seconds). */
export function hit(key, limit, windowMs, now = Date.now()) {
  if (buckets.size > MAX_KEYS) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + windowMs }; buckets.set(key, b); }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true, retryAfter: 0 };
}

export const _resetRateLimits = () => buckets.clear();

/** Client IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). Accepts a Headers object or a plain object. */
export function clientIp(headers) {
  const get = (n) => (typeof headers?.get === 'function' ? headers.get(n) : headers?.[n]);
  const xff = get('x-forwarded-for');
  const ip = (xff ? String(xff).split(',')[0] : get('x-real-ip')) || '';
  return ip.trim() || 'unknown';
}
