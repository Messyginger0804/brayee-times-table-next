// Seeded PRNG (mulberry32) with small helpers. Deterministic for a given seed.

function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @typedef {Object} Rng
 * @property {() => number} next float in [0,1)
 * @property {(min:number, max:number) => number} int inclusive integer
 * @property {<T>(arr:T[]) => T} pick
 * @property {(p:number) => boolean} chance
 * @property {<T>(arr:T[]) => T[]} shuffle returns a new array
 * @property {Map<string,string>} recent last prompt per skill+level (used to avoid back-to-back repeats)
 */

/**
 * Create a seeded RNG.
 * @param {number|string} [seed]
 * @returns {Rng}
 */
export function createRng(seed) {
  let a = hashSeed(seed === undefined ? Math.floor(Math.random() * 2 ** 32) : seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    recent: new Map(),
  };
}

let defaultRng = null;
/** Shared unseeded RNG used when callers pass none. */
export function getDefaultRng() {
  if (!defaultRng) defaultRng = createRng();
  return defaultRng;
}
