// Multiplication / division / estimation generators (grades 3-6, whole numbers).
import { B, eq } from '../build.js';
import { N, retry, maybeSwap, weightedPick, roundTo, gcd, canon } from '../util.js';

const R = {};
export const handlers = R;

const mulItems = (a, b) => eq(`${N(a)} x ${N(b)}`);
const trivial = (a, b) => a <= 1 || b <= 1;

/** Pick an (a,b) fact, down-weighting x0 / x1 so they never flood. */
function factFrom(rng, pairs) {
  const [a, b] = weightedPick(rng, pairs, ([x, y]) => (trivial(x, y) ? 0.2 : 1));
  return maybeSwap(rng, a, b);
}
const cross = (as, bs) => as.flatMap((a) => bs.map((b) => [a, b]));
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
function mulOut(rng, pairs, extra = {}) {
  const [a, b] = factFrom(rng, pairs);
  return { items: mulItems(a, b), answer: a * b, meta: { a, b, ...extra } };
}

// ---------- the 100-fact family (matches the Problem table) ----------
R['g3-mult-0-1-2-5-10'] = (rng, { params }) => mulOut(rng, cross(range(0, 10), params.b));
R['g3-mult-3-4'] = (rng, { params }) => mulOut(rng, cross(range(1, 10), params.b));
R['g3-mult-9-squares'] = (rng, { index }) => {
  const nines = cross(range(1, 10), [9]);
  const squares = range(6, 10).map((n) => [n, n]);
  return mulOut(rng, index === 0 ? nines : index === 1 ? squares : rng.chance(0.5) ? nines : squares);
};
R['g3-mult-6-7-8'] = (rng, { index }) => {
  // Squares are excluded: they belong to g3-mult-9-squares L2 (spec constraint "exclude pairs already covered").
  const sets = [
    cross([3, 4], [6]),
    cross([3, 4, 6], [7]),
    cross([3, 4, 6, 7], [8]),
    [[6, 7], [6, 8], [7, 8]],
  ];
  return mulOut(rng, sets[index]);
};
R['g3-mult-mixed'] = (rng) => mulOut(rng, cross(range(0, 10), range(0, 10)));

R['g3-mult-tens'] = (rng, { params }) => mulOut(rng, cross(range(2, 9), params.b));

R['g3-mult-2x1'] = (rng, { index }) => {
  const [a, b] = retry(() => {
    const x = rng.int(11, 99);
    const y = rng.int(2, 9);
    if (x % 10 === 0) return null;
    const ones = (x % 10) * y;
    const co = ones >= 10;
    const ct = Math.floor(x / 10) * y + Math.floor(ones / 10) >= 10;
    const n = (co ? 1 : 0) + (ct ? 1 : 0);
    return n === index ? [x, y] : null;
  });
  return { items: mulItems(a, b), answer: a * b, meta: { a, b } };
};

// ---------- division facts ----------
function divOut(d, q) {
  return { items: eq(`${N(d * q)} / ${d}`), answer: q, meta: { divisor: d, quotient: q, dividend: d * q } };
}
R['g3-div-facts'] = (rng, { index }) => {
  const sets = [[2, 5, 10], [3, 4], [9], [6, 7, 8], range(1, 10)];
  let divisors = sets[index];
  if (index === 2 && rng.chance(0.4)) {
    const n = rng.int(6, 10);
    return divOut(n, n);
  }
  const [d, q] = weightedPick(rng, cross(divisors, range(0, 10)), ([x, y]) => (x === 1 || y <= 1 ? (y === 0 ? 0.05 : 0.2) : 1));
  return divOut(d, q);
};

R['g3-missing-factor'] = (rng, { params }) => {
  const known = rng.pick(params.known || range(2, 10));
  const unknown = rng.int(2, 10);
  const product = known * unknown;
  const first = rng.chance(0.5);
  return {
    items: first ? [B, ` x ${known} = ${product}`] : [`${known} x `, B, ` = ${product}`],
    answer: unknown,
    meta: { known, product, first },
  };
};

// ---------- grade 4+ multiplication ----------
R['g4-mult-10-100'] = (rng, { params, index }) => {
  const b = index === 2 ? rng.pick([10, 100]) : params.b[0];
  const a = index === 2 ? rng.int(100, 999) : retry(() => {
    const x = rng.int(2, 99);
    return x === 10 ? null : x;
  });
  const [x, y] = maybeSwap(rng, a, b);
  return { items: mulItems(x, y), answer: a * b, meta: { a, b } };
};
R['g4-mult-11-15'] = (rng, { index }) => {
  if (index === 3) {
    const n = rng.int(11, 15);
    return { items: mulItems(n, n), answer: n * n, meta: { a: n, b: n } };
  }
  const bs = [[11], [12], [11, 12]][index];
  if (index === 2 && rng.chance(0.2)) return mulOut(rng, cross(range(2, 10), range(2, 10))); // review
  return mulOut(rng, cross(range(1, 12), bs));
};
const hasZero = (n) => /0/.test(String(n));
R['g4-mult-multi-by-1'] = (rng, { params, index }) => {
  const digits = params.digits;
  const a = retry(() => {
    const x = rng.int(10 ** (digits - 1), 10 ** digits - 1);
    if (x % 10 === 0) return null;
    if (index === 3 && !/0/.test(String(x).slice(1, -1))) return null;
    return x;
  });
  const b = rng.int(2, 9);
  return { items: mulItems(a, b), answer: a * b, meta: { a, b } };
};
R['g4-mult-2x2'] = (rng, { index }) => {
  const [a, b] = retry(() => {
    if (index === 0) return [rng.int(2, 9) * 10, rng.int(11, 99)];
    const x = rng.int(11, 99);
    const y = index === 1 ? rng.int(11, 19) : rng.int(11, 99);
    return x % 10 === 0 || y % 10 === 0 ? null : [x, y];
  });
  const [p, q] = maybeSwap(rng, a, b);
  return { items: mulItems(p, q), answer: a * b, meta: { a, b } };
};
R['g5-mult-3x2'] = (rng, { index }) => {
  const [a, b] = retry(() => {
    if (index === 0) return [rng.int(10, 99), rng.int(10, 99)];
    const x = rng.int(100, 999);
    const y = rng.int(11, 99);
    if (y % 10 === 0 || x % 10 === 0) return null;
    return hasZero(x) === (index === 2) ? [x, y] : null;
  });
  return { items: mulItems(a, b), answer: a * b, meta: { a, b } };
};

// ---------- long division ----------
function divide(rng, d, lo, hi, withRem, minQ = 2) {
  return retry(() => {
    const r = withRem ? (rng.chance(0.1) ? 0 : rng.int(1, d - 1)) : 0;
    const qLo = Math.max(minQ, Math.ceil((lo - r) / d));
    const qHi = Math.floor((hi - r) / d);
    if (qHi < qLo) return null;
    const q = rng.int(qLo, qHi);
    return { dividend: d * q + r, q, r };
  });
}
function divFrag({ dividend, q, r }, d, withRem) {
  const answer = r > 0 ? `${q} R ${r}` : String(q);
  return {
    items: eq(`${N(dividend)} / ${d}`),
    answer,
    answerType: withRem ? 'quotient_remainder' : 'integer',
    keypad: { remainder: withRem },
    meta: { dividend, divisor: d, q, r },
  };
}
R['g4-div-1digit'] = (rng, { params, index }) => {
  const d = rng.int(2, 9);
  const withRem = params.remainder;
  const digits = index === 2 ? rng.pick([2, 3]) : params.digits;
  const lo = digits === 2 ? 20 : 10 ** (digits - 1);
  const hi = 10 ** digits - 1;
  return divFrag(divide(rng, d, lo, hi, withRem, 10), d, withRem);
};
R['g5-div-2digit'] = (rng, { params, index }) => {
  const withRem = index === 2;
  const d = index === 0 ? rng.int(2, 9) * 10 : rng.int(11, 99);
  return divFrag(divide(rng, d, 100, 9999, withRem), d, withRem);
};
R['g6-div-multi-digit'] = (rng, { params, index }) => {
  if (index < 2) {
    const d = rng.int(11, 99);
    const lo = index === 0 ? 1000 : 10000;
    const hi = index === 0 ? 9999 : 99999;
    return divFrag(divide(rng, d, lo, hi, false), d, false);
  }
  // quotient to hundredths: dividend * 100 divisible by divisor, non-whole quotient
  const { d, dividend } = retry(() => {
    const dd = rng.int(11, 99);
    const step = 100 / gcd(100, dd);
    if (step === 100) return null;
    const m = step * rng.int(1, Math.floor((99999 * 100) / dd / step));
    if (m % 100 === 0) return null;
    const dv = (dd * m) / 100;
    return dv >= 1000 && dv <= 99999 && Number.isInteger(dv) ? { d: dd, dividend: dv } : null;
  });
  const m = (dividend * 100) / d;
  return {
    items: eq(`${N(dividend)} / ${d}`),
    answer: canon(m, 2),
    answerType: 'decimal',
    keypad: { decimal: true },
    meta: { dividend, divisor: d },
  };
};

// ---------- estimation ----------
R['g4-estimate'] = (rng, { params }) => {
  const place = params.place;
  const op = rng.pick(params.ops);
  const [lo, hi] = place === 10 ? [12, 99] : place === 100 ? [101, 999] : [1001, 9999];
  const [a, b] = retry(() => {
    const x = rng.int(lo, hi);
    const y = rng.int(lo, hi);
    if (x % place === 0 || y % place === 0) return null;
    if (op === 'sub') {
      if (x <= y || roundTo(x, place) - roundTo(y, place) < place) return null;
    }
    return [x, y];
  });
  const ra = roundTo(a, place);
  const rb = roundTo(b, place);
  const sym = op === 'add' ? '+' : op === 'sub' ? '-' : 'x';
  const ans = op === 'add' ? ra + rb : op === 'sub' ? ra - rb : ra * rb;
  return {
    items: eq(`Estimate ${N(a)} ${sym} ${N(b)} (nearest ${N(place)})`),
    answer: ans,
    meta: { a, b, op, place },
  };
};
