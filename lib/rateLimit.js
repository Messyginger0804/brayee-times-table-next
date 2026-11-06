// Best-effort fixed-window rate limiter. In-memory, so it is PER SERVER INSTANCE (serverless instances do not share it):
// it slows down a script hammering one instance, it is not a global guarantee. The per-account lockout in
// lib/pinAuth.js is the real protection and lives in the database.
//
// Memory is hard-capped at `cfg.maxKeys` entries. Expired entries are pruned on access (the touched key, plus a
// throttled sweep when full); if still full, the oldest-inserted key is evicted (Map keeps insertion order).
// Trade-off: a flood of unique keys (e.g. spoofed IPs) can evict real counters; that is the price of bounded memory.
const buckets = new Map(); // key -> { count, resetAt }
export const cfg = { maxKeys: 5000, sweepEveryMs: 1000 };
let lastSweep = 0;

function sweep(now) {
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** Make room for one new key. */
function makeRoom(now) {
  if (buckets.size < cfg.maxKeys) return;
  if (now - lastSweep >= cfg.sweepEveryMs) sweep(now);
  while (buckets.size >= cfg.maxKeys) buckets.delete(buckets.keys().next().value);
}

/** Count one hit for `key`. Returns { ok, retryAfter } (seconds). */
export function hit(key, limit, windowMs, now = Date.now()) {
  let b = buckets.get(key);
  if (b && b.resetAt <= now) { buckets.delete(key); b = undefined; } // expired: prune on access
  if (!b) {
    makeRoom(now);
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  return { ok: true, retryAfter: 0 };
}

export const _resetRateLimits = () => { buckets.clear(); lastSweep = 0; };
export const _size = () => buckets.size;

/** Client IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). Accepts a Headers object or a plain object. */
export function clientIp(headers) {
  const get = (n) => (typeof headers?.get === 'function' ? headers.get(n) : headers?.[n]);
  const xff = get('x-forwarded-for');
  const ip = (xff ? String(xff).split(',')[0] : get('x-real-ip')) || '';
  return ip.trim() || 'unknown';
}
