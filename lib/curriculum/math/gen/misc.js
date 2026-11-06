// Order of operations, primes, factors, integers, percent, ratio, exponents, GCF/LCM, equations.
import { B, F, P, eq, par } from '../build.js';
import { retry, gcd, lcm, isPrime, canon } from '../util.js';

const R = {};
export const handlers = R;

const sign = (rng) => (rng.chance(0.5) ? 1 : -1);
const nonzero = (rng, lo, hi) => retry(() => (rng.int(lo, hi) || null));

// ---------- grade 4 factors & multiples ----------
R['g4-factors-multiples'] = (rng, { params, index }) => {
  if (index === 2) {
    const k = rng.int(2, 12);
    const n = rng.int(Math.max(6, k), 100);
    return { items: [`Smallest multiple of ${k} greater than ${n} = `, B], answer: (Math.floor(n / k) + 1) * k, meta: { k, n } };
  }
  const ks = index === 0 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const k = rng.pick(ks);
  const yes = rng.chance(0.5);
  const n = retry(() => {
    if (yes) {
      const m = rng.int(Math.ceil(6 / k), Math.floor(100 / k)) * k;
      return m >= 6 && m > k ? m : null;
    }
    const base = rng.int(1, Math.floor(100 / k)) * k;
    const c = rng.chance(0.5) ? base + rng.pick([-1, 1]) : rng.int(6, 100);
    return c >= 6 && c <= 100 && c % k !== 0 ? c : null;
  });
  return {
    items: [`Is ${k} a factor of ${n}?`],
    answer: n % k === 0 ? 'yes' : 'no',
    answerType: 'choice',
    choices: ['yes', 'no'],
    meta: { k, n },
  };
};

// ---------- grade 5 order of operations ----------
const PREC = { '+': 1, '-': 1, x: 2, '/': 2 };
function evalTree(t) {
  if (typeof t === 'number') return t;
  const a = evalTree(t.l);
  const b = evalTree(t.r);
  if (a === null || b === null) return null;
  let v;
  if (t.op === '+') v = a + b;
  else if (t.op === '-') v = a - b;
  else if (t.op === 'x') v = a * b;
  else v = b !== 0 && a % b === 0 ? a / b : null;
  return v === null || v < 0 || v > 999 ? null : v;
}
function printTree(t, ctx) {
  if (typeof t === 'number') return String(t);
  const side = (child, right) => {
    const s = printTree(child, ctx);
    if (typeof child === 'number') return s;
    const lower = PREC[child.op] < PREC[t.op];
    const sameRight = PREC[child.op] === PREC[t.op] && right && (t.op === '-' || t.op === '/' || child.op !== t.op);
    if (lower || sameRight) {
      ctx.parens++;
      return `(${s})`;
    }
    return s;
  };
  return `${side(t.l, false)} ${t.op} ${side(t.r, true)}`;
}
function leftToRight(t) {
  // evaluate as if no parentheses: flatten tree in print order and apply strictly left to right
  const toks = [];
  (function walk(n) {
    if (typeof n === 'number') toks.push(n);
    else {
      walk(n.l);
      toks.push(n.op);
      walk(n.r);
    }
  })(t);
  let v = toks[0];
  for (let i = 1; i < toks.length; i += 2) {
    const b = toks[i + 1];
    v = toks[i] === '+' ? v + b : toks[i] === '-' ? v - b : toks[i] === 'x' ? v * b : v / b;
  }
  return v;
}
function randTree(rng, leaves) {
  if (leaves === 1) return rng.int(2, 12);
  const left = rng.int(1, leaves - 1);
  const op = rng.pick(['+', '-', 'x', 'x', '/']);
  return { op, l: randTree(rng, left), r: randTree(rng, leaves - left) };
}
function flatEval(nums, ops) {
  // precedence evaluation of a flat expression; null when a division is inexact or a running value goes negative
  const terms = [nums[0]];
  const addOps = [];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i];
    const x = nums[i + 1];
    if (o === 'x') terms[terms.length - 1] *= x;
    else if (o === '/') {
      const cur = terms[terms.length - 1];
      if (cur % x !== 0) return null;
      terms[terms.length - 1] = cur / x;
    } else {
      addOps.push(o);
      terms.push(x);
    }
  }
  let v = terms[0];
  for (let i = 0; i < addOps.length; i++) {
    v = addOps[i] === '+' ? v + terms[i + 1] : v - terms[i + 1];
    if (v < 0) return null;
  }
  return v;
}
function flatLeftToRight(nums, ops) {
  let v = nums[0];
  ops.forEach((o, i) => {
    const x = nums[i + 1];
    v = o === '+' ? v + x : o === '-' ? v - x : o === 'x' ? v * x : v / x;
  });
  return v;
}
R['g5-order-of-ops'] = (rng, { params }) => {
  const want = params.parens === false ? 0 : params.parens;
  if (want === 0) {
    return retry(() => {
      const n = rng.int(3, 5);
      const nums = Array.from({ length: n }, () => rng.int(2, 12));
      const ops = Array.from({ length: n - 1 }, () => rng.pick(['+', '-', 'x', 'x', '/']));
      if (!ops.some((o) => o === 'x' || o === '/') || !ops.some((o) => o === '+' || o === '-')) return null;
      const v = flatEval(nums, ops);
      if (v === null || v > 999 || v === flatLeftToRight(nums, ops)) return null;
      const text = nums.map((x, i) => (i ? `${ops[i - 1]} ${x}` : String(x))).join(' ');
      return { items: eq(text), answer: v, meta: { text } };
    });
  }
  const { text, value } = retry(() => {
    const leaves = want === 2 ? rng.int(4, 5) : rng.int(3, 4);
    const t = randTree(rng, leaves);
    const v = evalTree(t);
    if (v === null) return null;
    const ctx = { parens: 0 };
    const text = printTree(t, ctx);
    if (ctx.parens !== want || leftToRight(t) === v) return null;
    return { text, value: v };
  });
  return { items: eq(text), answer: value, meta: { text } };
};

// ---------- grade 5 primes ----------
const HARD_COMPOSITE = [49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 95, 99];
R['g5-prime-composite'] = (rng, { params }) => {
  const max = params.max;
  const wantPrime = rng.chance(0.4);
  const n = retry(() => {
    const c = rng.int(2, max);
    if (wantPrime !== isPrime(c)) return null;
    if (!wantPrime && c < 4) return null;
    return c;
  });
  const hard = !wantPrime && max > 30 && rng.chance(0.4);
  const m = hard ? rng.pick(HARD_COMPOSITE.filter((x) => x <= max)) : n;
  return {
    items: [`Is ${m} prime or composite?`],
    answer: isPrime(m) ? 'prime' : 'composite',
    answerType: 'choice',
    choices: ['prime', 'composite'],
    meta: { n: m },
  };
};

// ---------- grade 6 integers ----------
R['g6-integers-opp-abs'] = (rng, { index }) => {
  if (index === 0) {
    const n = rng.chance(0.05) ? 0 : nonzero(rng, -100, 100);
    return { items: eq(`Opposite of ${n}`), answer: String(-n), meta: { n } };
  }
  if (index === 1) {
    const n = rng.chance(0.05) ? 0 : nonzero(rng, -100, 100);
    return { items: eq(`|${n}|`), answer: Math.abs(n), meta: { n } };
  }
  const a = nonzero(rng, -20, 20);
  const b = nonzero(rng, -20, 20);
  const form = rng.pick(['sum', 'diff', 'inside']);
  if (form === 'sum') return { items: eq(`|${a}| + |${b}|`), answer: Math.abs(a) + Math.abs(b), meta: { a, b } };
  if (form === 'diff') return { items: eq(`|${a}| - |${b}|`), answer: Math.abs(a) - Math.abs(b), meta: { a, b } };
  return { items: eq(`|${a} + ${par(b)}|`), answer: Math.abs(a + b), meta: { a, b } };
};
R['g6-integer-add-sub'] = (rng, { index }) => {
  const range = index === 3 ? 100 : 20;
  const mode = index === 3 ? rng.pick(['add', 'sub']) : ['add', 'add', 'sub'][index];
  let a;
  let b;
  if (index === 0) {
    a = nonzero(rng, 1, range) * sign(rng);
    b = retry(() => {
      const m = rng.int(1, range);
      return m !== Math.abs(a) || rng.chance(0.1) ? (a > 0 ? -m : m) : null;
    });
  } else if (index === 1) {
    a = -rng.int(1, range);
    b = -rng.int(1, range);
  } else {
    [a, b] = retry(() => {
      const x = nonzero(rng, -range, range);
      const y = nonzero(rng, -range, range);
      return x !== y ? [x, y] : null;
    });
  }
  const sym = mode === 'add' ? '+' : '-';
  return {
    items: eq(`${a} ${sym} ${par(b)}`),
    answer: mode === 'add' ? a + b : a - b,
    meta: { a, b, mode },
  };
};
R['g6-integer-mul-div'] = (rng, { index }) => {
  const mode = index === 2 ? 'div' : index === 3 ? rng.pick(['mul', 'div']) : 'mul';
  const m1 = rng.int(2, 12);
  const m2 = rng.int(2, 12);
  let s1;
  let s2;
  if (index === 0) [s1, s2] = rng.chance(0.5) ? [-1, 1] : [1, -1];
  else if (index === 1) [s1, s2] = [-1, -1];
  else [s1, s2] = retry(() => (rng.chance(0.15) ? [1, 1] : [sign(rng), sign(rng)]));
  if (mode === 'mul') {
    const a = m1 * s1;
    const b = m2 * s2;
    return { items: eq(`${a} x ${par(b)}`), answer: a * b, meta: { a, b, mode } };
  }
  const d = m1 * s1;
  const q = m2 * s2;
  return { items: eq(`${d * q} / ${par(d)}`), answer: q, meta: { dividend: d * q, d, mode } };
};

// ---------- grade 6 forms, percent, ratio ----------
const FRAC_SET = [
  [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10],
];
R['g6-fraction-decimal-percent'] = (rng, { index }) => {
  const kp = { decimal: true };
  if (index === 0) {
    const [n, d] = rng.pick(FRAC_SET);
    return {
      items: [F(n, d), ' = ', B, ' %'],
      answer: canon((n * 100 * 100) / d, 2),
      answerType: 'decimal',
      keypad: kp,
      meta: { form: 'fracPct', n, d },
    };
  }
  if (index === 1) {
    const hund = rng.int(1, 99);
    const dec = hund % 10 === 0 ? `0.${hund / 10}` : `0.${String(hund).padStart(2, '0')}`;
    return {
      items: [`${dec} = `, B, ' %'],
      answer: String(hund),
      answerType: 'decimal',
      keypad: kp,
      meta: { form: 'decPct', hund },
    };
  }
  const [n, d] = rng.pick([[1, 8], [3, 8], [5, 8], [7, 8], [1, 3], [2, 3]]);
  if (d === 3) {
    return {
      items: [F(n, d), ' = ', B, ' % (nearest whole number)'],
      answer: String(Math.round((n * 100) / d)),
      answerType: 'decimal',
      keypad: kp,
      meta: { form: 'thirdsPct', n, d },
    };
  }
  if (rng.chance(0.5))
    return {
      items: [F(n, d), ' = ', B, ' %'],
      answer: canon((n * 100 * 10) / d, 1),
      answerType: 'decimal',
      keypad: kp,
      meta: { form: 'fracPct', n, d },
    };
  return {
    items: [F(n, d), ' as a decimal = ', B],
    answer: canon((n * 1000) / d, 3),
    answerType: 'decimal',
    keypad: kp,
    meta: { form: 'fracDec', n, d },
  };
};
R['g6-percent-of'] = (rng, { params }) => {
  const pc = rng.pick(params.percent);
  const unit = { 1: 100, 10: 10, 20: 5, 25: 4, 50: 2, 75: 4 }[pc];
  const n = rng.chance(0.8)
    ? retry(() => {
        const c = rng.int(10, 400);
        return c % unit === 0 ? c : null;
      })
    : rng.int(10, 400);
  return {
    items: eq(`${pc}% of ${n}`),
    answer: canon(pc * n, 2),
    answerType: 'decimal',
    keypad: { decimal: true },
    meta: { pc, n },
  };
};

const RATE_TEMPLATES = [
  (t, c) => `$${t} for ${c} pens: cost of 1 pen ($) = `,
  (t, c) => `${t} miles in ${c} hours: miles per hour = `,
  (t, c) => `${t} pages in ${c} days: pages per day = `,
  (t, c) => `${t} words in ${c} minutes: words per minute = `,
  (t, c) => `$${t} for ${c} tickets: cost of 1 ticket ($) = `,
];
R['g6-ratio-unit-rate'] = (rng, { params, index }) => {
  if (index === 0) {
    const [a, b, k] = retry(() => {
      const x = rng.int(1, 12);
      const y = rng.int(2, 12);
      return x !== y ? [x, y, rng.int(2, 12)] : null;
    });
    return { items: [`${a} : ${b} = ${a * k} : `, B], answer: b * k, meta: { a, b, k } };
  }
  const tpl = rng.pick(RATE_TEMPLATES);
  if (index === 1) {
    const c = rng.int(2, 12);
    const rate = rng.int(2, 12);
    return { items: [tpl(rate * c, c), B], answer: rate, meta: { total: rate * c, c, tplIndex: 0 } };
  }
  const c = rng.pick([2, 4, 5, 10, 20, 25]);
  const total = retry(() => {
    const t = rng.int(c + 1, 250);
    return t % c !== 0 ? t : null;
  });
  const dec = (total * 100) / c; // hundredths
  return {
    items: [tpl(total, c), B],
    answer: canon(dec, 2),
    answerType: 'decimal',
    keypad: { decimal: true },
    meta: { total, c },
  };
};

// ---------- grade 6 exponents, GCF/LCM, equations ----------
R['g6-exponents'] = (rng, { params, index }) => {
  if (index === 2) {
    const form = rng.pick(['a+b^e x c', 'a x b^e - c', '(a+b)^2', 'b^e - a x c']);
    const [a, b, c, e] = [rng.int(2, 9), rng.int(2, 6), rng.int(2, 6), rng.int(2, 3)];
    if (form === 'a+b^e x c')
      return { items: eq(`${a} + `, P(b, e), ` x ${c}`), answer: a + b ** e * c, meta: { form } };
    if (form === 'a x b^e - c') {
      const v = a * b ** e;
      return { items: eq(`${a} x `, P(b, e), ` - ${c}`), answer: v - c, meta: { form } };
    }
    if (form === '(a+b)^2') return { items: eq(P(`(${a} + ${b})`, 2)), answer: (a + b) ** 2, meta: { form } };
    const v = b ** e;
    const prod = a * c;
    if (prod > v) return R['g6-exponents'](rng, { params, index });
    return { items: eq(P(b, e), ` - ${a} x ${c}`), answer: v - prod, meta: { form } };
  }
  const [base, exp] = retry(() => {
    if (index === 0) {
      const e = rng.pick([2, 3]);
      return [rng.int(2, e === 3 ? 12 : 12), e];
    }
    return [rng.pick([2, 3]), rng.int(2, 5)];
  });
  return { items: eq(P(base, exp)), answer: base ** exp, meta: { base, exp } };
};
R['g6-gcf-lcm'] = (rng, { params }) => {
  const mode = params.mode;
  const lo = mode === 'lcm' ? 2 : params.max >= 100 ? 12 : 4;
  const [a, b] = retry(() => {
    const x = rng.int(lo, params.max);
    const y = rng.int(lo, params.max);
    if (x === y) return null;
    if (mode === 'gcf') {
      const g = gcd(x, y);
      if (g === 1 && !rng.chance(0.1)) return null;
      if ((g === x || g === y) && !rng.chance(0.15)) return null;
    } else if (lcm(x, y) === Math.max(x, y) && !rng.chance(0.15)) return null;
    return [x, y];
  });
  return {
    items: eq(`${mode === 'gcf' ? 'GCF' : 'LCM'} of ${a} and ${b}`),
    answer: mode === 'gcf' ? gcd(a, b) : lcm(a, b),
    meta: { a, b, mode },
  };
};
R['g6-one-step-equations'] = (rng, { params }) => {
  const form = rng.pick(params.forms || ['add', 'sub', 'mul', 'div']);
  const p = rng.int(2, 12);
  if (form === 'add') {
    const x = rng.int(1, 20);
    return { items: [`x + ${p} = ${x + p}, x = `, B], answer: x, meta: { form, p, x } };
  }
  if (form === 'sub') {
    const x = rng.int(p + 1, 20 + p);
    return { items: [`x - ${p} = ${x - p}, x = `, B], answer: x, meta: { form, p, x } };
  }
  if (form === 'mul') {
    const x = rng.int(2, 20);
    return { items: [`${p}x = ${p * x}, x = `, B], answer: x, meta: { form, p, x } };
  }
  const q = rng.int(2, 12);
  return { items: [`x / ${p} = ${q}, x = `, B], answer: p * q, meta: { form, p, q } };
};
