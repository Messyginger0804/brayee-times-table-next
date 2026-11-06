// Fraction generators (grades 3-6).
import { B, F, M, eq } from '../build.js';
import { retry, gcd, fracStr, mixedStr, maybeSwap } from '../util.js';

const R = {};
export const handlers = R;

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const cmp = (n1, d1, n2, d2) => {
  const l = n1 * d2;
  const r = n2 * d1;
  return l < r ? '<' : l > r ? '>' : '=';
};
const cmpFrag = (n1, d1, n2, d2, meta) => ({
  items: [F(n1, d1), ' ', B, ' ', F(n2, d2)],
  answer: cmp(n1, d1, n2, d2),
  answerType: 'symbol',
  meta: { n1, d1, n2, d2, ...meta },
});
const frac = (rng, dLo, dHi) => {
  const d = rng.int(dLo, dHi);
  return [rng.int(1, d - 1), d];
};

// ---------- grade 3 ----------
R['g3-fraction-equiv'] = (rng, { params, index }) => {
  const den1s = index === 0 ? [2] : index === 1 ? [3, 4] : [2, 3, 4, 6];
  const [d1, d2] = retry(() => {
    const a = rng.pick(den1s);
    const b = rng.pick([4, 6, 8]);
    return b % a === 0 && b !== a ? [a, b] : null;
  });
  const n = rng.int(1, d1 - 1);
  return {
    items: [F(n, d1), ' = ', F(null, d2)],
    answer: (n * d2) / d1,
    meta: { n, d1, d2 },
  };
};
R['g3-fraction-compare'] = (rng, { index }) => {
  const dens = [2, 3, 4, 6, 8];
  const mode = index === 0 ? 'den' : index === 1 ? 'num' : rng.pick(['den', 'num']);
  if (mode === 'den') {
    const d = rng.pick(dens.filter((x) => x >= 3));
    const [a, b] = retry(() => {
      const x = rng.int(1, d - 1);
      const y = rng.int(1, d - 1);
      return x !== y ? [x, y] : null;
    });
    return cmpFrag(a, d, b, d, { mode });
  }
  const [d1, d2] = retry(() => {
    const x = rng.pick(dens);
    const y = rng.pick(dens);
    return x !== y && Math.min(x, y) > 2 ? [x, y] : null;
  });
  const n = rng.int(1, Math.min(d1, d2) - 1);
  return cmpFrag(n, d1, n, d2, { mode });
};

// ---------- grade 4 ----------
R['g4-fraction-equiv'] = (rng, { params, index }) => {
  const [fLo, fHi] = index === 0 ? [2, 3] : [2, 6];
  const f = rng.int(fLo, fHi);
  if (index < 2) {
    const d1 = rng.int(2, 10);
    const n = rng.int(1, d1 - 1);
    return { items: [F(n, d1), ' = ', F(null, d1 * f)], answer: n * f, meta: { n, d1, f, unknown: 'num' } };
  }
  const [n, d1] = retry(() => {
    const d = rng.int(3, 10);
    const x = rng.int(1, d - 1);
    return gcd(x, d) === 1 ? [x, d] : null;
  });
  return { items: [F(n * f, d1 * f), ' = ', F(n, null)], answer: d1, meta: { n, d1, f, unknown: 'den' } };
};
R['g4-fraction-compare'] = (rng, { index }) => {
  if (index === 0) {
    const [n, d] = frac(rng, 3, 12);
    const left = rng.chance(0.5);
    return left ? cmpFrag(n, d, 1, 2, { half: true }) : cmpFrag(1, 2, n, d, { half: true });
  }
  if (index === 1) {
    const [n1, d1] = frac(rng, 2, 6);
    const k = rng.int(2, Math.floor(12 / d1));
    const d2 = d1 * k;
    // sometimes force equal
    const n2 = rng.chance(0.2) ? n1 * k : rng.int(1, d2 - 1);
    const [a, b] = [[n1, d1], [n2, d2]];
    return rng.chance(0.5) ? cmpFrag(a[0], a[1], b[0], b[1], {}) : cmpFrag(b[0], b[1], a[0], a[1], {});
  }
  const [x, y] = retry(() => {
    const p = frac(rng, 2, 12);
    const q = frac(rng, 2, 12);
    return p[0] === q[0] && p[1] === q[1] ? null : [p, q];
  });
  return cmpFrag(x[0], x[1], y[0], y[1], {});
};

function fracAnswer(n, d, mixed = false) {
  return { answer: fracStr(n, d), answerDisplay: mixed ? mixedStr(n, d) : fracStr(n, d) };
}

R['g4-fraction-add-sub'] = (rng, { index }) => {
  const sub = index === 1;
  const d = rng.int(3, 12);
  let n1;
  let n2;
  if (index === 0) {
    n1 = rng.int(1, d - 1);
    n2 = rng.int(1, d - n1);
  } else if (index === 1) {
    n1 = rng.int(2, d - 1);
    n2 = rng.int(1, n1 - 1);
  } else {
    [n1, n2] = retry(() => {
      const x = rng.int(2, d - 1);
      const y = rng.int(2, d - 1);
      return x + y > d ? [x, y] : null;
    });
  }
  const nn = sub ? n1 - n2 : n1 + n2;
  return {
    items: eq(F(n1, d), sub ? ' - ' : ' + ', F(n2, d)),
    ...fracAnswer(nn, d),
    meta: { n1, n2, d, sub },
  };
};
R['g5-fraction-add-sub-unlike'] = (rng, { index }) => {
  const sub = rng.chance(0.5);
  const [d1, d2] = retry(() => {
    const x = rng.int(2, 12);
    const y = rng.int(2, 12);
    if (x === y) return null;
    const mult = x % y === 0 || y % x === 0;
    if (index === 0) return mult ? [x, y] : null;
    if (index === 1) return !mult ? [x, y] : null;
    return gcd(x, y) === 1 && x > 2 && y > 2 ? [x, y] : null;
  });
  if (index < 2) {
    const [a, b] = retry(() => {
      const p = [rng.int(1, d1 - 1), d1];
      const q = [rng.int(1, d2 - 1), d2];
      if (sub && p[0] * q[1] <= q[0] * p[1]) return null;
      return [p, q];
    });
    const num = sub ? a[0] * b[1] - b[0] * a[1] : a[0] * b[1] + b[0] * a[1];
    return {
      items: eq(F(a[0], a[1]), sub ? ' - ' : ' + ', F(b[0], b[1])),
      ...fracAnswer(num, a[1] * b[1]),
      meta: { a, b, sub },
    };
  }
  // mixed numbers, simplest form requested
  const [a, b] = retry(() => {
    const p = [rng.int(1, 3), rng.int(1, d1 - 1), d1];
    const q = [rng.chance(0.4) ? 0 : rng.int(1, 3), rng.int(1, d2 - 1), d2];
    const vp = p[0] * p[2] + p[1];
    const vq = q[0] * q[2] + q[1];
    if (sub && vp * q[2] <= vq * p[2]) return null;
    return [p, q];
  });
  const imp = (x) => [x[0] * x[2] + x[1], x[2]];
  const [pn, pd] = imp(a);
  const [qn, qd] = imp(b);
  const num = sub ? pn * qd - qn * pd : pn * qd + qn * pd;
  const show = (x) => (x[0] === 0 ? F(x[1], x[2]) : M(x[0], x[1], x[2]));
  return {
    items: [show(a), sub ? ' - ' : ' + ', show(b), ' = ', B, ' (simplest form)'],
    ...fracAnswer(num, pd * qd, true),
    requireSimplest: true,
    meta: { a, b, sub },
  };
};

R['g4-decimals-frac'] = (rng, { index }) => {
  if (index < 2) {
    const places = index === 0 ? 1 : 2;
    const den = 10 ** places;
    const nn = index === 0 ? rng.int(1, 9) : retry(() => {
      const c = rng.int(1, 99);
      return c % 10 ? c : null;
    });
    const dec = (nn / den).toFixed(places);
    if (rng.chance(0.5))
      return { items: [`${dec} = `, F(null, den)], answer: nn, answerType: 'decimal', meta: { form: 'toFrac', nn, den } };
    return {
      items: [F(nn, den), ' as a decimal = ', B],
      answer: String(Number(dec)),
      answerType: 'decimal',
      meta: { form: 'toDec', nn, den },
    };
  }
  const t = rng.int(2, 8);
  // trap (65%): the longer numeral looks bigger but is smaller, e.g. 0.4 vs 0.35
  const u = rng.chance(0.65) ? rng.int(1, t - 1) : rng.int(t + 1, 9);
  const v = rng.int(1, 9);
  const small = `0.${u}${v}`;
  const tenth = `0.${t}`;
  const [x, y] = maybeSwap(rng, tenth, small);
  const answer = Number(tenth) > Number(small) ? tenth : small;
  return { items: [`Which is greater, ${x} or ${y}? `, B], answer, answerType: 'decimal', meta: { x, y } };
};

// ---------- grade 5 / 6 fraction multiply & divide ----------
R['g5-fraction-mult-whole'] = (rng, { index }) => {
  const [w, n, d] = retry(() => {
    const ww = rng.int(2, 12);
    const dd = rng.int(2, 10);
    const nn = index === 0 ? 1 : rng.int(1, dd - 1);
    if (index === 2) {
      const g = gcd(ww * nn, dd);
      if (g < 2 || (ww * nn) % dd === 0) return null;
    }
    return [ww, nn, dd];
  });
  const items = rng.chance(0.5) ? [`${w} x `, F(n, d), ' = ', B] : [F(n, d), ` x ${w} = `, B];
  if (index === 2) items.push(' (simplest form)');
  return { items, ...fracAnswer(w * n, d), requireSimplest: index === 2, meta: { w, n, d } };
};
R['g5-unit-fraction-division'] = (rng, { params, index }) => {
  const w = rng.int(2, 12);
  const d = rng.int(2, 10);
  const mode = index === 0 ? 'whole_div_unit' : index === 1 ? 'unit_div_whole' : rng.pick(['whole_div_unit', 'unit_div_whole']);
  if (mode === 'whole_div_unit')
    return { items: [`${w} / `, F(1, d), ' = ', B], answer: String(w * d), meta: { mode, w, d } };
  return { items: [F(1, d), ` / ${w} = `, B], ...fracAnswer(1, d * w), meta: { mode, w, d } };
};

const mixedOf = (rng, dMax) => {
  const d = rng.int(2, dMax);
  return [rng.int(1, 3), rng.int(1, d - 1), d];
};
const impr = (x) => [x[0] * x[2] + x[1], x[2]];
const showM = (x) => M(x[0], x[1], x[2]);

R['g6-fraction-mult'] = (rng, { index }) => {
  if (index === 0) {
    const a = frac(rng, 2, 12);
    const b = frac(rng, 2, 12);
    return {
      items: eq(F(...a), ' x ', F(...b)),
      ...fracAnswer(a[0] * b[0], a[1] * b[1]),
      meta: { a, b },
    };
  }
  if (index === 1) {
    const m = mixedOf(rng, 6);
    const other = rng.chance(0.5) ? { w: rng.int(2, 9) } : { f: frac(rng, 2, 10) };
    const [mn, md] = impr(m);
    if (other.w) {
      return { items: eq(showM(m), ` x ${other.w}`), ...fracAnswer(mn * other.w, md), meta: { m, other } };
    }
    return {
      items: eq(showM(m), ' x ', F(...other.f)),
      ...fracAnswer(mn * other.f[0], md * other.f[1]),
      meta: { m, other },
    };
  }
  const m1 = mixedOf(rng, 6);
  const m2 = mixedOf(rng, 6);
  const [a, b] = impr(m1);
  const [c, d] = impr(m2);
  return { items: eq(showM(m1), ' x ', showM(m2)), ...fracAnswer(a * c, b * d), meta: { m1, m2 } };
};
R['g6-fraction-div'] = (rng, { index }) => {
  if (index === 0) {
    const [a, b] = retry(() => {
      const x = rng.int(2, 12);
      const y = rng.int(2, 12);
      return x !== y ? [x, y] : null;
    });
    return { items: eq(F(1, a), ' / ', F(1, b)), ...fracAnswer(b, a), meta: { a, b } };
  }
  if (index === 1) {
    const [p, q] = retry(() => {
      const x = frac(rng, 2, 12);
      const y = frac(rng, 2, 12);
      const num = x[0] * y[1];
      const den = x[1] * y[0];
      const g = gcd(num, den);
      return num / g <= 24 && den / g <= 12 && !(x[0] === y[0] && x[1] === y[1]) ? [x, y] : null;
    });
    return { items: eq(F(...p), ' / ', F(...q)), ...fracAnswer(p[0] * q[1], p[1] * q[0]), meta: { p, q } };
  }
  const { m, w } = retry(() => {
    const mm = mixedOf(rng, 6);
    const ww = rng.int(2, 6);
    const [n, d] = impr(mm);
    const g = gcd(n, d * ww);
    return n / g <= 24 && (d * ww) / g <= 12 ? { m: mm, w: ww } : null;
  });
  const [n, d] = impr(m);
  return { items: eq(showM(m), ` / ${w}`), ...fracAnswer(n, d * w), meta: { m, w } };
};

export { range };
