// Decimal generators (grades 4-6). All arithmetic is done on scaled integers (no float error).
import { eq } from '../build.js';
import { retry, fmtFixed, canon, gcd } from '../util.js';

const R = {};
export const handlers = R;

const sc = (v, from, to) => v * 10 ** (to - from);
const show = (s, p) => fmtFixed(s, p);

/** Random decimal operand with exactly `p` places (last digit non-zero when p>0), value in [loV, hiV]. */
function operand(rng, p, loV, hiV) {
  const k = 10 ** p;
  return retry(() => {
    const s = rng.int(Math.max(1, Math.round(loV * k)), Math.round(hiV * k));
    return p > 0 && s % 10 === 0 ? null : s;
  });
}
const textOut = (a, p, b, q, sym, scaled, places, meta) => ({
  items: eq(`${show(a, p)} ${sym} ${show(b, q)}`),
  answer: canon(scaled, places),
  answerType: 'decimal',
  keypad: { decimal: true },
  meta: { a, p, b, q, sym, ...meta },
});

// ---------- grade 4 / 5 add & subtract ----------
function addSub(rng, { aligned, mixedPlaces, fromWhole, subOnly, loV = 0.1, hiV = 99.99 }) {
  let p;
  let q;
  if (fromWhole) {
    p = 0;
    q = rng.pick([1, 2]);
  } else if (aligned) {
    p = 2;
    q = 2;
  } else {
    [p, q] = rng.chance(0.5) ? [1, 2] : [2, 1];
  }
  const sub = subOnly || fromWhole || rng.chance(0.5);
  if (fromWhole) {
    const W = rng.int(2, 99);
    const b = retry(() => {
      const x = operand(rng, q, 0.1, W - 0.1);
      return x < W * 10 ** q ? x : null;
    });
    return textOut(W, 0, b, q, '-', sc(W, 0, 2) - sc(b, q, 2), 2, { sub: true });
  }
  const a = operand(rng, p, loV, hiV);
  const b = operand(rng, q, loV, hiV);
  const A = sc(a, p, 2);
  const Bv = sc(b, q, 2);
  if (!sub) return textOut(a, p, b, q, '+', A + Bv, 2, {});
  if (A === Bv) return addSub(rng, { aligned, mixedPlaces, fromWhole, subOnly, loV, hiV });
  return A > Bv ? textOut(a, p, b, q, '-', A - Bv, 2, {}) : textOut(b, q, a, p, '-', Bv - A, 2, {});
}
R['g4-decimal-add-sub'] = (rng, { index }) =>
  addSub(rng, { aligned: index === 0, mixedPlaces: index === 1, fromWhole: index === 2 });
R['g5-decimal-add-sub'] = (rng, { index }) =>
  addSub(rng, { aligned: index === 0, mixedPlaces: index === 1, fromWhole: index === 2, loV: 0.01, hiV: 99.99 });

// ---------- grade 5 place value / rounding ----------
R['g5-decimal-place-round'] = (rng, { index }) => {
  if (index === 0) {
    const N3 = retry(() => {
      const s = rng.int(1001, 99999);
      if (s % 10 === 0) return null;
      const digits = fmtFixed(s, 3).replace('.', '');
      return new Set(digits).size === digits.length ? s : null;
    });
    const str = fmtFixed(N3, 3);
    const frac = str.split('.')[1];
    const pos = rng.int(0, 2);
    const digit = Number(frac[pos]);
    if (digit === 0) return R['g5-decimal-place-round'](rng, { index });
    return {
      items: eq(`Value of the ${digit} in ${str}`),
      answer: canon(digit, pos + 1),
      answerType: 'decimal',
      keypad: { decimal: true },
      meta: { n: str, digit, pos },
    };
  }
  const tenths = index === 1;
  const s = retry(() => {
    let c;
    if (tenths) {
      c = rng.chance(0.2) ? rng.int(1, 999) * 100 + 50 : rng.int(1, 99999);
      if (c % 100 === 0 || c > 99999) return null;
    } else {
      c = rng.chance(0.2) ? rng.int(1, 9999) * 10 + 5 : rng.int(1, 99999);
      if (c % 10 === 0 || c > 99999) return null;
    }
    return c;
  });
  const places = s % 10 === 0 ? 2 : 3;
  const str = fmtFixed(s, 3).slice(0, fmtFixed(s, 3).length - (3 - places));
  const unit = tenths ? 100 : 10;
  const r = Math.floor((s + unit / 2) / unit);
  return {
    items: eq(`Round ${str} to the nearest ${tenths ? 'tenth' : 'hundredth'}`),
    answer: canon(r, tenths ? 1 : 2),
    answerType: 'decimal',
    keypad: { decimal: true },
    meta: { s, str, tenths },
  };
};

R['g5-powers-of-10'] = (rng, { index }) => {
  if (index === 3) {
    const k = rng.int(2, 6);
    return {
      items: [{ t: 'power', base: '10', exp: k }, ' = ', { t: 'blank' }],
      answer: 10 ** k,
      meta: { k },
    };
  }
  const k = rng.int(1, 3);
  const pow = 10 ** k;
  const kp = { decimal: true };
  if (index === 0) {
    const w = retry(() => {
      const x = rng.int(2, 999);
      return x % 10 ? x : null;
    });
    return { items: eq(`${w} x ${pow}`), answer: w * pow, answerType: 'decimal', keypad: kp, meta: { w, pow } };
  }
  if (index === 1) {
    const p = rng.int(1, 3);
    const s = operand(rng, p, 0.001, 99.999);
    return {
      items: eq(`${show(s, p)} x ${pow}`),
      answer: canon(s * pow, p),
      answerType: 'decimal',
      keypad: kp,
      meta: { s, p, pow },
    };
  }
  const p = rng.chance(0.65) ? 0 : 1;
  const n =
    p === 0
      ? retry(() => {
          const x = rng.int(2, 9999);
          return x % 10 ? x : null;
        })
      : operand(rng, 1, 0.1, 999.9);
  return {
    items: eq(`${show(n, p)} / ${pow}`),
    answer: canon(n, p + k),
    answerType: 'decimal',
    keypad: kp,
    meta: { s: n, p, pow },
  };
};

// ---------- grade 5 decimal multiply / divide ----------
R['g5-decimal-mult'] = (rng, { index }) => {
  let a;
  let p;
  let b;
  let q;
  if (index === 0) {
    p = rng.pick([1, 2]);
    a = operand(rng, p, 1.1, 99.9);
    q = 0;
    b = rng.int(2, 12);
  } else if (index === 1) {
    p = 1;
    q = 1;
    a = operand(rng, 1, 0.2, 9.9);
    b = operand(rng, 1, 0.2, 9.9);
    if (a % 10 === 0 || b % 10 === 0) return R['g5-decimal-mult'](rng, { index });
  } else {
    p = 2;
    a = operand(rng, 2, 0.11, 9.99);
    const kind = rng.pick(['whole', 'tenths', 'hundredths']);
    if (kind === 'whole') {
      q = 0;
      b = rng.int(2, 12);
    } else if (kind === 'tenths') {
      q = 1;
      b = operand(rng, 1, 0.2, 9.9);
    } else {
      q = 2;
      b = operand(rng, 2, 0.11, 2.99);
    }
  }
  [a, p, b, q] = rng.chance(0.5) ? [a, p, b, q] : [b, q, a, p];
  return textOut(a, p, b, q, 'x', a * b, p + q, {});
};
R['g5-decimal-div'] = (rng, { index }) => {
  if (index === 1) {
    // whole / whole, terminating in <= 2 places, non-integer quotient
    const { d, w } = retry(() => {
      const dd = rng.int(2, 9);
      const g = gcd(dd, 100);
      if (g === 1) return null;
      const j = rng.int(1, Math.floor(999 / (dd / g)));
      if (j % g === 0) return null;
      const ww = (dd / g) * j;
      return ww >= 3 && ww <= 999 && ww % dd !== 0 ? { d: dd, w: ww } : null;
    });
    const q100 = (w * 100) / d;
    return {
      items: eq(`${w} / ${d}`),
      answer: canon(q100, 2),
      answerType: 'decimal',
      keypad: { decimal: true },
      meta: { dividend: w, p: 0, d },
    };
  }
  const d = index === 0 ? rng.int(2, 9) : rng.int(10, 99);
  const Q = retry(() => {
    const q = rng.int(20, Math.floor(99999 / d));
    if (q % 100 === 0) return null;
    const D = d * q;
    return D % 100 !== 0 && D <= 99999 && D >= 10 ? q : null; // dividend has a real decimal part
  });
  const D = d * Q;
  const p = D % 10 === 0 ? 1 : 2;
  const dividend = p === 1 ? D / 10 : D;
  return {
    items: eq(`${show(dividend, p)} / ${d}`),
    answer: canon(Q, 2),
    answerType: 'decimal',
    keypad: { decimal: true },
    meta: { dividend, p, d },
  };
};

// ---------- grade 6 mixed decimal operations ----------
R['g6-decimal-ops'] = (rng, { params }) => {
  const op = rng.pick(params.ops);
  if (op === 'add' || op === 'sub') {
    const p = rng.int(1, 3);
    let q = rng.int(1, 3);
    if (p !== 3 && q !== 3) q = 3;
    const a = operand(rng, p, 0.1, 99.999);
    const b = operand(rng, q, 0.1, 99.999);
    const A = sc(a, p, 3);
    const Bv = sc(b, q, 3);
    if (op === 'add') return textOut(a, p, b, q, '+', A + Bv, 3, {});
    if (A === Bv) return R['g6-decimal-ops'](rng, { params });
    return A > Bv ? textOut(a, p, b, q, '-', A - Bv, 3, {}) : textOut(b, q, a, p, '-', Bv - A, 3, {});
  }
  if (op === 'mul') {
    const p = rng.int(1, 2);
    const q = rng.int(1, 2);
    const a = operand(rng, p, 1.1, 99.99);
    const b = operand(rng, q, 0.11, 9.99);
    return textOut(a, p, b, q, 'x', a * b, p + q, {});
  }
  if (params.divisor === 'whole') {
    const d = rng.int(2, 12);
    const qp = rng.int(1, 3);
    const Q = operand(rng, qp, 0.2, 80);
    const D = d * Q; // same number of places as Q
    return {
      items: eq(`${show(D, qp)} / ${d}`),
      answer: canon(Q, qp),
      answerType: 'decimal',
      keypad: { decimal: true },
      meta: {},
    };
  }
  // decimal divisor: dividend = quotient * divisor, <= 3 places
  const { e, ep, Q, qp } = retry(() => {
    const epp = rng.pick([1, 1, 2]);
    const ee = operand(rng, epp, 0.2, 9.9);
    const qpp = rng.int(0, 3 - epp);
    const QQ = qpp === 0 ? rng.int(2, 99) * 1 : operand(rng, qpp, 0.2, 99);
    return { e: ee, ep: epp, Q: QQ, qp: qpp };
  });
  const D = Q * e; // scale qp + ep
  const dp = qp + ep;
  return {
    items: eq(`${show(D, dp)} / ${show(e, ep)}`),
    answer: canon(Q, qp),
    answerType: 'decimal',
    keypad: { decimal: true },
    meta: {},
  };
};
