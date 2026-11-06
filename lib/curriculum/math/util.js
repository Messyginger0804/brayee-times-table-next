// Small numeric helpers shared by generators and answer checking. No dependencies.

export const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
export const lcm = (a, b) => (a / gcd(a, b)) * b;

export function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

/** Integer with thousands separators, e.g. 1234567 -> "1,234,567". */
export function N(n) {
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `-${s}` : s;
}

/** Scaled integer -> fixed decimal string. fmtFixed(345, 2) = "3.45", fmtFixed(230, 2) = "2.30". */
export function fmtFixed(scaled, places) {
  const neg = scaled < 0;
  const s = String(Math.abs(scaled)).padStart(places + 1, '0');
  const ip = s.slice(0, s.length - places);
  const fp = s.slice(s.length - places);
  return (neg ? '-' : '') + (places ? `${ip}.${fp}` : ip);
}

/** Strip trailing zeros: "2.30" -> "2.3", "3.00" -> "3". */
function trimDec(str) {
  if (!str.includes('.')) return str;
  return str.replace(/0+$/, '').replace(/\.$/, '');
}

/** Canonical decimal string for a scaled integer. */
export const canon = (scaled, places) => trimDec(fmtFixed(scaled, places));

/** Round half up to a multiple of `place` (positive n). */
export const roundTo = (n, place) => Math.floor((n + place / 2) / place) * place;

/** Number of carries when adding a + b column by column. */
export function addCarries(a, b) {
  let c = 0;
  let carry = 0;
  while (a > 0 || b > 0 || carry > 0) {
    const s = (a % 10) + (b % 10) + carry;
    carry = s >= 10 ? 1 : 0;
    c += carry;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return c;
}

/** Number of borrows when computing a - b (a >= b) column by column. */
export function subBorrows(a, b) {
  let c = 0;
  let br = 0;
  while (a > 0 || b > 0) {
    const da = (a % 10) - br;
    const db = b % 10;
    if (da < db) {
      br = 1;
      c++;
    } else br = 0;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return c;
}

/** Repeat `fn` until it returns a truthy value. */
export function retry(fn, max = 20000) {
  for (let i = 0; i < max; i++) {
    const v = fn(i);
    if (v) return v;
  }
  throw new Error('curriculum generator could not satisfy its constraints');
}

/** Pick from `items` with weights from `wfn`. */
export function weightedPick(rng, items, wfn) {
  let total = 0;
  const ws = items.map((it) => {
    const w = wfn(it);
    total += w;
    return w;
  });
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Randomly swap two operands (for commutative presentation). */
export const maybeSwap = (rng, a, b) => (rng.chance(0.5) ? [b, a] : [a, b]);

/** Reduced fraction -> canonical answer string ("3/2" or "4"). */
export function fracStr(n, d) {
  const g = gcd(n, d) || 1;
  n /= g;
  d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

/** Same value shown as a mixed number when improper ("3/2" -> "1 1/2"). */
export function mixedStr(n, d) {
  const g = gcd(n, d) || 1;
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  if (n < d) return `${n}/${d}`;
  const w = Math.floor(n / d);
  const r = n % d;
  return r === 0 ? String(w) : `${w} ${r}/${d}`;
}
