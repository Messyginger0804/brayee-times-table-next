// Independent oracles and constraint checks for the math generators.
// Nothing here imports generator code: answers are recomputed from the prompt text.
import assert from 'node:assert/strict';

export const un = (s) => s.replace(/×/g, 'x').replace(/÷/g, '/').replace(/−/g, '-');
const COIN_WORD = { penny: 'penny', nickel: 'nickel', dime: 'dime', quarter: 'quarter' };

export function plainFromParts(parts) {
  return parts
    .map((p) => {
      switch (p.t) {
        case 'text':
          return un(p.v);
        case 'blank':
          return '__';
        case 'fraction':
          return `${p.num ?? '__'}/${p.den ?? '__'}`;
        case 'mixed':
          return `${p.whole} ${p.num}/${p.den}`;
        case 'power':
          return `${p.base}^${p.exp}`;
        case 'coin': {
          const w = COIN_WORD[p.coin];
          const pl = w === 'penny' ? 'pennies' : `${w}s`;
          return `${p.count} ${p.count === 1 ? w : pl}`;
        }
        default:
          throw new Error(`unknown part ${p.t}`);
      }
    })
    .join('');
}

export const num = (s) => Number(String(s).replace(/,/g, '').replace(/[()]/g, ''));
export const nums = (s) => (s.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
export const lhs = (prompt) => prompt.replace(/ = __.*$/, '');
export const digitsOf = (n) => String(n).split('').map(Number).reverse(); // least significant first
export const places = (s) => (String(s).split('.')[1] || '').length;

export function carries(a, b) {
  const x = digitsOf(a);
  const y = digitsOf(b);
  let c = 0;
  let carry = 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const s = (x[i] || 0) + (y[i] || 0) + carry;
    carry = s >= 10 ? 1 : 0;
    c += carry;
  }
  return c;
}
export function borrows(a, b) {
  const x = digitsOf(a);
  const y = digitsOf(b);
  let c = 0;
  let br = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] - br;
    if (v < (y[i] || 0)) {
      br = 1;
      c++;
    } else br = 0;
  }
  return c;
}

/** Evaluate an arithmetic prompt left-hand side with JS as the independent calculator. */
export function evalExpr(left) {
  let s = left.replace(/,/g, '');
  s = s.replace(/\|([^|]+)\|/g, 'Math.abs($1)');
  s = s.replace(/(\d+) (\d+)\/(\d+)/g, '(($1)+($2)/($3))');
  s = s.replace(/(\d+)\/(\d+)/g, '(($1)/($2))');
  s = s.replace(/ x /g, ' * ').replace(/\^/g, '**');
  assert.match(s, /^[0-9\s.+\-*/()a-zA-Z]+$/, `unsafe expr ${s}`);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${s});`)();
}

const WORD_PLACE = { ten: 10, hundred: 100, thousand: 1000, 'ten thousand': 10000, 'hundred thousand': 100000 };
const COIN_VAL = { penny: 1, pennies: 1, nickel: 5, nickels: 5, dime: 10, dimes: 10, quarter: 25, quarters: 25 };

function roundHalfUp(n, step) {
  return Math.floor((n + step / 2) / step) * step;
}
const gcdT = (a, b) => (b ? gcdT(b, a % b) : Math.abs(a));

/** Expected answer: { num } (numeric) or { str } (exact text). */
export function oracle(p) {
  const prompt = p.prompt.replace(/ \(simplest form\)$/, '');
  const id = p.skillId;
  let m;
  // ----- word / special prompts -----
  if ((m = /^What comes after (\d+)\?$/.exec(prompt))) return { num: +m[1] + 1 };
  if ((m = /^What comes before (\d+)\?$/.exec(prompt))) return { num: +m[1] - 1 };
  if (/^[\d, ]*__[\d, ]*$/.test(prompt) && /, /.test(prompt) && !/=/.test(prompt)) {
    const t = prompt.split(', ');
    if (id === 'g1-count-seq') {
      const bi = t.indexOf('__');
      const n = t.map((x) => (x === '__' ? NaN : num(x)));
      return { num: bi === 0 ? n[1] - 1 : bi === 1 ? n[0] + 1 : n[1] + 1 };
    }
    const n = t.slice(0, 3).map(num);
    return { num: n[2] + (n[1] - n[0]) };
  }
  if ((m = /^10 (more|less) than (\d+) = __$/.exec(prompt))) return { num: +m[2] + (m[1] === 'more' ? 10 : -10) };
  if ((m = /^(\d+) tens (\d+) ones = __$/.exec(prompt))) return { num: +m[1] * 10 + +m[2] };
  if ((m = /^(\d+) hundreds (\d+) tens (\d+) ones = __$/.exec(prompt))) return { num: +m[1] * 100 + +m[2] * 10 + +m[3] };
  if ((m = /^How many tens in (\d+)\?$/.exec(prompt))) return { num: Math.floor(+m[1] / 10) };
  if ((m = /^What is the value of the (\d) in (\d+)\? __$/.exec(prompt))) {
    const idx = m[2].indexOf(m[1]);
    return { num: +m[1] * 10 ** (m[2].length - 1 - idx) };
  }
  if ((m = /^(\d+) groups? of (\d+) = __$/.exec(prompt)) || (m = /^(\d+) rows? of (\d+) = __$/.exec(prompt))) return { num: +m[1] * +m[2] };
  if ((m = /^([\d.]+) __ ([\d.]+)$/.exec(prompt))) return { str: +m[1] < +m[2] ? '<' : +m[1] > +m[2] ? '>' : '=' };
  if ((m = /^(\d+)\/(\d+) __ (\d+)\/(\d+)$/.exec(prompt))) {
    const l = +m[1] * +m[4];
    const r = +m[3] * +m[2];
    return { str: l < r ? '<' : l > r ? '>' : '=' };
  }
  if ((m = /^Is (\d+) even or odd\?$/.exec(prompt))) return { str: +m[1] % 2 === 0 ? 'even' : 'odd' };
  if ((m = /^Is (\d+) prime or composite\?$/.exec(prompt))) {
    const n = +m[1];
    let prime = n > 1;
    for (let d = 2; d < n; d++) if (n % d === 0) prime = false;
    return { str: prime ? 'prime' : 'composite' };
  }
  if ((m = /^Is (\d+) a factor of (\d+)\?$/.exec(prompt))) return { str: +m[2] % +m[1] === 0 ? 'yes' : 'no' };
  if ((m = /^Smallest multiple of (\d+) greater than (\d+) = __$/.exec(prompt))) {
    let v = +m[2] + 1;
    while (v % +m[1] !== 0) v++;
    return { num: v };
  }
  if ((m = /^(GCF|LCM) of (\d+) and (\d+) = __$/.exec(prompt))) {
    const a = +m[2];
    const b = +m[3];
    if (m[1] === 'GCF') {
      for (let d = Math.min(a, b); d >= 1; d--) if (a % d === 0 && b % d === 0) return { num: d };
    }
    for (let v = Math.max(a, b); ; v++) if (v % a === 0 && v % b === 0) return { num: v };
  }
  if ((m = /^Round ([\d,]+) to the nearest (.+) = __$/.exec(prompt))) {
    const step = /^\d+$/.test(m[2]) ? +m[2] : WORD_PLACE[m[2]];
    return { num: roundHalfUp(num(m[1]), step) };
  }
  if ((m = /^Round ([\d.]+) to the nearest (tenth|hundredth) = __$/.exec(prompt))) {
    const scaled = Math.round(+m[1] * 1000); // thousandths, exact for <= 3 places
    const step = m[2] === 'tenth' ? 100 : 10;
    return { num: roundHalfUp(scaled, step) / 1000 };
  }
  if ((m = /^Value of the (\d) in (\d+)\.(\d+) = __$/.exec(prompt))) {
    return { num: +m[1] * 10 ** -(m[3].indexOf(m[1]) + 1) };
  }
  if ((m = /^Estimate ([\d,]+) ([+\-x]) ([\d,]+) \(nearest ([\d,]+)\) = __$/.exec(prompt))) {
    const step = num(m[4]);
    const a = roundHalfUp(num(m[1]), step);
    const b = roundHalfUp(num(m[3]), step);
    return { num: m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b };
  }
  if ((m = /^(\d+)% of (\d+) = __$/.exec(prompt))) return { num: (+m[1] * +m[2]) / 100 };
  if ((m = /^(\d+)\/(\d+) = __ % \(nearest whole number\)$/.exec(prompt))) return { num: Math.round((100 * +m[1]) / +m[2]) };
  if ((m = /^(\d+)\/(\d+) = __ %$/.exec(prompt))) return { num: (100 * +m[1]) / +m[2] };
  if ((m = /^(\d?\.\d+) = __ %$/.exec(prompt))) return { num: Math.round(+m[1] * 10000) / 100 };
  if ((m = /^(\d+)\/(\d+) as a decimal = __$/.exec(prompt))) return { num: +m[1] / +m[2] };
  if ((m = /^([\d.]+) = __\/(\d+)$/.exec(prompt))) return { num: Math.round(+m[1] * +m[2]) };
  if ((m = /^(\d+)\/(\d+) = __\/(\d+)$/.exec(prompt))) return { num: (+m[1] * +m[3]) / +m[2] };
  if ((m = /^(\d+)\/(\d+) = (\d+)\/__$/.exec(prompt))) return { num: (+m[2] * +m[3]) / +m[1] };
  if ((m = /^Which is greater, ([\d.]+) or ([\d.]+)\? __$/.exec(prompt))) return { num: Math.max(+m[1], +m[2]) };
  if ((m = /^(\d+) : (\d+) = (\d+) : __$/.exec(prompt))) return { num: (+m[2] * +m[3]) / +m[1] };
  if (/^\$?\d+ (?:\w+ )?(?:for|in) \d+ .*= __$/.test(prompt)) {
    m = /^\$?(\d+) (?:\w+ )?(?:for|in) (\d+) /.exec(prompt);
    return { num: +m[1] / +m[2] };
  }
  if ((m = /^Opposite of (-?\d+) = __$/.exec(prompt))) return { num: -+m[1] };
  // equations: brute-force the unknown
  if (/, x = __$/.test(prompt)) {
    const eqn = prompt.replace(/, x = __$/, '').replace(/(\d)x/g, '$1*x').replace(/ x /g, ' * x ');
    const [l, r] = eqn.split(' = ');
    const hits = [];
    for (let x = 0; x <= 400; x++) {
      // eslint-disable-next-line no-new-func
      const f = Function('x', `return (${l.replace(/ \* x \*/g, ' * x ')}) === (${r});`);
      if (f(x)) hits.push(x);
    }
    assert.equal(hits.length, 1, `equation ${prompt}`);
    return { num: hits[0] };
  }
  // coin / money totals
  if (/ (cents|= \$__)/.test(prompt) || /= \$__$/.test(prompt)) {
    let total = 0;
    for (const t of prompt.matchAll(/(\d+) (pennies|penny|nickels?|dimes?|quarters?)/g)) total += +t[1] * COIN_VAL[t[2]];
    const bill = /\$(\d+) bill/.exec(prompt);
    if (bill) total += +bill[1] * 100;
    if (/1 dollar/.test(prompt)) total += 100;
    return { num: /\$__$/.test(prompt) ? total / 100 : total };
  }
  // missing term / factor: brute-force the blank
  if (/__/.test(prompt.replace(/ = __$/, '')) || (/__ x \d+ = \d+$/.test(prompt))) {
    const [l, r] = prompt.replace(/ x /g, ' * ').split(' = ');
    const hits = [];
    for (let x = 0; x <= 100; x++) {
      // eslint-disable-next-line no-new-func
      if (Function('x', `return (${l.replace('__', 'x')}) === (${r});`)(x)) hits.push(x);
    }
    assert.equal(hits.length, 1, `missing ${prompt}`);
    return { num: hits[0] };
  }
  // ----- plain "<expr> = __" -----
  m = /^(.*) = __(?: \(simplest form\))?$/.exec(prompt);
  assert.ok(m, `no oracle for prompt: ${prompt}`);
  const left = m[1];
  const dm = /^([\d,]+) \/ (\d+)$/.exec(left);
  if (dm && p.answerType === 'quotient_remainder') {
    const a = num(dm[1]);
    const b = +dm[2];
    return { str: a % b ? `${Math.floor(a / b)} R ${a % b}` : `${a / b}` };
  }
  return { num: evalExpr(left) };
}

/** Compare problem.answer to the oracle; also check canonical formatting. */
export function assertAnswer(p) {
  const exp = oracle(p);
  const a = p.answer;
  assert.equal(typeof a, 'string');
  if (exp.str !== undefined) {
    assert.equal(a, exp.str, `answer for ${p.prompt}`);
    return;
  }
  let v;
  if (/^-?\d+\/\d+$/.test(a)) {
    const [n, d] = a.split('/').map(Number);
    assert.ok(d > 1 && gcdT(n, d) === 1, `fraction not reduced ${a}`);
    v = n / d;
  } else {
    assert.match(a, /^-?(0|[1-9]\d*)(\.\d*[1-9])?$/, `non-canonical number ${a}`);
    v = Number(a);
  }
  assert.ok(Math.abs(v - exp.num) <= 1e-9 * Math.max(1, Math.abs(exp.num)), `${p.prompt}: answer ${a} expected ${exp.num}`);
}

export function keypadCanType(p) {
  const k = p.keypad;
  const a = p.answer;
  if (p.answerType === 'symbol') return k.compare && ['<', '>', '='].includes(a);
  if (p.answerType === 'choice') return Array.isArray(k.choices) && k.choices.includes(a);
  if (a.startsWith('-') && !k.minus) return false;
  if (a.includes('.') && !k.decimal) return false;
  if (a.includes('/') && !k.fractionSlash) return false;
  if (a.includes(' R ') && !k.remainder) return false;
  const nDigits = (a.match(/\d/g) || []).length;
  if (p.answerType === 'quotient_remainder') return nDigits <= 14 && k.digits;
  return k.digits && nDigits <= k.maxDigits;
}

// --------------------------- constraints ---------------------------
const bin = (prompt) => {
  const m = /^(\(?-?[\d,.]+\)?) ([+\-x/]) (\(?-?[\d,.]+\)?) = __$/.exec(prompt);
  assert.ok(m, `not a binary expr: ${prompt}`);
  return { a: num(m[1]), op: m[2], b: num(m[3]), ra: m[1], rb: m[3] };
};
const inR = (v, lo, hi, msg) => assert.ok(v >= lo && v <= hi, `${msg}: ${v} not in ${lo}..${hi}`);
const isMult10 = (n) => n % 10 === 0;
const mult = (prompt) => {
  const { a, b } = bin(prompt);
  return [a, b];
};

/** Per-skill constraint assertions. ctx: { p, i (level index), params, prompt, ans } */
export const CONSTRAINTS = {
  'g1-count-seq': ({ p, params }) => {
    const [lo, hi] = params.n;
    for (const n of nums(p.prompt)) inR(n, lo, hi, p.prompt);
    inR(Number(p.answer), lo, hi, 'answer');
  },
  'g1-skip-count': ({ p, params, i }) => {
    const t = p.prompt.split(', ').slice(0, 3).map(num);
    const step = t[1] - t[0];
    assert.ok(params.step.includes(step), p.prompt);
    assert.equal(t[0] % step, 0);
    assert.ok(Number(p.answer) <= 120);
    if (params.offsetStart) assert.ok(t[0] > 0);
    assert.equal(t[2] - t[1], step);
  },
  'g2-skip-count': ({ p, params }) => {
    const t = p.prompt.split(', ').slice(0, 3).map(num);
    const step = t[1] - t[0];
    assert.ok(params.step.includes(step), p.prompt);
    assert.ok(Number(p.answer) <= (params.max || 1000));
  },
  'g1-ten-more-less': ({ p, params }) => {
    const r = Number(p.answer);
    inR(r, 0, params.crossHundred ? 120 : 99, p.prompt);
    const n = nums(p.prompt)[1];
    inR(n, params.n[0], params.n[1], 'n');
    if (!params.crossHundred) assert.equal(Math.floor(n / 100), Math.floor(r / 100));
  },
  'g1-place-value': ({ p, params, i }) => {
    const r = /^How many/.test(p.prompt) ? nums(p.prompt)[0] : Number(p.answer);
    inR(r, 11, params.max || 120, p.prompt);
    if (!/^How many/.test(p.prompt)) assert.notEqual(r % 10, 0);
    if (i === 1) assert.match(p.prompt, /^\d+ \+ \d+ = __$/);
    if (i === 0) assert.ok(r <= 99);
  },
  'g2-place-value': ({ p, i }) => {
    if (i === 2) return assert.match(p.prompt, /^What is the value/);
    const n = Number(p.answer);
    inR(n, 100, 999, 'n');
    const hasZero = /0/.test(String(n));
    assert.equal(hasZero, i === 1, p.prompt);
  },
  'g1-compare': ({ p, i }) => {
    const [a, b] = nums(p.prompt);
    inR(a, 0, 100, 'a');
    inR(b, 0, 100, 'b');
    const sameTens = Math.floor(a / 10) === Math.floor(b / 10);
    if (i === 0) assert.ok(!sameTens && a !== b);
    if (i === 1) assert.ok(sameTens);
  },
  'g2-compare-1000': ({ p, i }) => {
    const [a, b] = nums(p.prompt);
    inR(a, 100, 999, 'a');
    inR(b, 100, 999, 'b');
    const d = (n) => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
    const [x, y] = [d(a), d(b)];
    if (i === 0) assert.notEqual(x[0], y[0]);
    if (i === 1) assert.ok(x[0] === y[0] && x[1] !== y[1]);
    if (i === 2) assert.ok(x[0] === y[0] && x[1] === y[1]);
  },
  'g1-add-10': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(a, 0, 10, 'a');
    inR(b, 0, 10, 'b');
    assert.ok(a + b <= 10);
    if (i === 0) assert.ok([a, b].some((x) => x <= 1));
    if (i === 1) assert.ok(a === b && a <= 5);
    if (i === 2) assert.ok(a + b <= 5);
  },
  'g1-sub-10': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    assert.ok(b <= a && a <= 10 && b >= 0);
    if (i === 0) assert.ok(a <= 5);
  },
  'g1-add-20': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(a, 2, 9, 'a');
    inR(b, 2, 9, 'b');
    inR(a + b, 11, 20, 'sum');
    if (i === 0) assert.ok(a === b && a >= 6);
    if (i === 1) assert.ok([a, b].some((x) => x >= 8));
    if (i === 2) assert.equal(Math.abs(a - b), 1);
  },
  'g1-sub-20': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(a, 11, 20, 'minuend');
    inR(b, 2, 9, 'sub');
    assert.ok(a - b >= 2);
    if (i === 0) assert.equal(a, 2 * b);
    if (i === 1) assert.ok(b >= 8);
  },
  'g1-missing-number': ({ p, params, i }) => {
    for (const n of nums(p.prompt)) inR(n, 0, params.max, p.prompt);
    inR(Number(p.answer), 0, params.max, 'answer');
    if (i === 0) assert.match(p.prompt, /^\d+ \+ __ = \d+$/);
  },
  'g1-add-sub-tens': ({ p, i }) => {
    const { a, b, op } = bin(p.prompt);
    inR(Number(p.answer), 0, 100, 'result');
    if (i < 2) assert.ok(isMult10(a) && isMult10(b));
    assert.equal(op, i === 1 ? '-' : '+');
    if (i === 2) {
      assert.ok(a >= 10 && a <= 99 && b >= 1 && b <= 9);
      assert.ok((a % 10) + b <= 9, 'no regrouping');
    }
  },
  'g1-coins': coinCheck(100, [2, 5]),
  'g2-money-cents': coinCheck(100, [3, 6]),
  'g2-add-20': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(a, 0, 10, 'a');
    inR(b, 0, 10, 'b');
    if (i === 0) assert.ok(a + b <= 10);
    if (i === 3) assert.ok(a + b <= 18);
    if (i === 1) assert.ok(Math.abs(a - b) <= 1);
    if (i === 2) assert.ok([a, b].some((x) => x === 8 || x === 9));
  },
  'g2-sub-20': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    assert.ok(b <= a && a <= 18 && b <= 9);
    const [lo, hi] = [[0, 10], [11, 14], [15, 18]][i];
    inR(a, lo, hi, 'minuend');
  },
  'g2-add-2digit': ({ p, i }) => {
    const t = lhs(p.prompt).split(' + ').map(Number);
    t.forEach((x) => inR(x, 10, 99, 'addend'));
    const sum = t.reduce((s, x) => s + x, 0);
    assert.ok(sum <= 200);
    if (i < 2) {
      assert.equal(t.length, 2);
      const ones = t[0] % 10 + (t[1] % 10);
      if (i === 0) assert.ok(ones <= 9 && sum <= 99);
      else assert.ok(ones >= 10);
    } else {
      assert.equal(t.length, i + 1);
      assert.ok(sum <= 100);
    }
  },
  'g2-sub-2digit': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(a, 20, 99, 'a');
    inR(b, 10, 98, 'b');
    assert.ok(a - b >= 0);
    const borrow = a % 10 < b % 10;
    if (i === 0) assert.ok(!borrow);
    if (i === 1) assert.ok(borrow);
    if (i === 2) assert.ok(isMult10(a));
  },
  'g2-mental-10-100': ({ p, params }) => {
    const m = /^(\d+) ([+-]) (\d+) = __$/.exec(p.prompt);
    const n = +m[1];
    const d = +m[3];
    assert.equal(d, params.delta[0]);
    inR(n, 100, 900, 'n');
    const r = Number(p.answer);
    inR(r, 0, 1000, 'result');
    if (params.crossHundred === false) assert.equal(Math.floor(n / 100), Math.floor(r / 100));
    if (params.crossHundred === true) assert.notEqual(Math.floor(n / 100), Math.floor(r / 100));
  },
  'g2-add-1000': ({ p, i }) => addBig(p, i === 0 ? 'x100' : i - 1, 100, 1000),
  'g3-add-1000': ({ p, i }) => addBig(p, i, 100, 1000),
  'g2-sub-1000': ({ p, i }) => subBig(p, i === 0 ? 'x100' : i - 1, i === 0 ? 100 : 10),
  'g3-sub-1000': ({ p, i }) => subBig(p, i, 100),
  'g2-equal-groups': ({ p, params }) => {
    const m = /(\d+) (?:groups|rows) of (\d+)|^(\d+(?: \+ \d+)+)/.exec(p.prompt);
    if (m[3]) {
      const t = m[3].split(' + ').map(Number);
      assert.ok(new Set(t).size === 1 && t.length >= 2 && t.length <= 5);
      assert.ok(params.size.includes(t[0]));
    } else {
      inR(+m[1], 2, 5, 'groups');
      assert.ok(params.size.includes(+m[2]));
    }
  },
  'g3-round': ({ p, params, i }) => {
    const m = /^Round (\d+) to the nearest (\d+)/.exec(p.prompt);
    const n = +m[1];
    assert.equal(+m[2], params.place);
    assert.notEqual(n % params.place, 0);
    inR(n, ...[[11, 99], [100, 999], [101, 999]][i], 'n');
  },
  'g4-place-value-round': ({ p, i }) => {
    const m = /^Round ([\d,]+) to the nearest (.+) = __$/.exec(p.prompt);
    const n = num(m[1]);
    const step = WORD_PLACE[m[2]];
    assert.notEqual(n % step, 0);
    assert.ok(n >= step);
    if (i === 0) assert.ok(n <= 9999 && n >= 1000 && step <= 100);
    if (i === 1) assert.ok(n <= 99999 && step === 1000);
    if (i === 2) assert.ok(n <= 999999);
  },
  'g3-mult-0-1-2-5-10': ({ p, params, i }) => {
    const [a, b] = mult(p.prompt);
    inR(a, 0, 10, 'a');
    assert.ok(params.b.includes(a) || params.b.includes(b), p.prompt);
    if (i === 3) assert.ok([a, b].some((x) => x <= 1));
  },
  'g3-mult-3-4': ({ p, params }) => {
    const [a, b] = mult(p.prompt);
    assert.ok(params.b.includes(a) || params.b.includes(b));
    inR(Math.min(a, b) === a && !params.b.includes(a) ? a : Math.max(a, b) === b && !params.b.includes(b) ? b : Math.min(a, b), 1, 10, 'other');
  },
  'g3-mult-9-squares': ({ p, i }) => {
    const [a, b] = mult(p.prompt);
    const sq = a === b && a >= 6 && a <= 10;
    const nine = a === 9 || b === 9;
    if (i === 0) assert.ok(nine);
    if (i === 1) assert.ok(sq);
    if (i === 2) assert.ok(sq || nine);
  },
  'g3-mult-6-7-8': ({ p, i }) => {
    const [a, b] = mult(p.prompt);
    assert.notEqual(a, b, 'squares are excluded');
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (i === 0) assert.ok(hi === 6 && [3, 4].includes(lo));
    if (i === 1) assert.ok(hi === 7 && [3, 4, 6].includes(lo));
    if (i === 2) assert.ok(hi === 8 && [3, 4, 6, 7].includes(lo));
    if (i === 3) assert.ok(['6x7', '6x8', '7x8'].includes(`${lo}x${hi}`));
  },
  'g3-mult-mixed': ({ p, params }) => {
    const [a, b] = mult(p.prompt);
    inR(a, 0, 10, 'a');
    inR(b, 0, 10, 'b');
  },
  'g3-div-facts': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    assert.ok(b >= 1 && b <= 10 && a <= 100 && a % b === 0);
    const q = a / b;
    inR(q, 0, 10, 'q');
    const sets = [[2, 5, 10], [3, 4], null, [6, 7, 8], null];
    if (sets[i]) assert.ok(sets[i].includes(b), p.prompt);
    if (i === 2) assert.ok(b === 9 || q === b);
  },
  'g3-missing-factor': ({ p, params }) => {
    const m = /^(?:__ x (\d+)|(\d+) x __) = (\d+)$/.exec(p.prompt);
    const known = +(m[1] || m[2]);
    const prod = +m[3];
    inR(prod, 4, 100, 'product');
    inR(Number(p.answer), 1, 10, 'answer');
    assert.ok(params.known ? params.known.includes(known) : known >= 2 && known <= 10);
  },
  'g3-mult-tens': ({ p, params }) => {
    const [a, b] = mult(p.prompt);
    const t = Math.max(a, b);
    const s = Math.min(a, b);
    inR(s, 2, 9, 'small');
    assert.ok(params.b.includes(t), p.prompt);
    assert.ok(a * b <= 810);
  },
  'g3-mult-2x1': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(a, 11, 99, 'a');
    inR(b, 2, 9, 'b');
    const tens = Math.floor(a / 10);
    const ones = a % 10;
    const co = ones * b >= 10;
    const ct = tens * b + Math.floor((ones * b) / 10) >= 10;
    assert.equal((co ? 1 : 0) + (ct ? 1 : 0), i, p.prompt);
    if (i === 0) assert.ok(ones * b <= 9 && tens * b <= 9);
  },
  'g3-even-odd': ({ p, params }) => inR(nums(p.prompt)[0], 10, params.max, 'n'),
  'g3-fraction-equiv': ({ p, params, i }) => {
    const m = /^(\d+)\/(\d+) = __\/(\d+)$/.exec(p.prompt);
    const [n, d1, d2] = [+m[1], +m[2], +m[3]];
    assert.ok(n < d1 && d2 % d1 === 0 && d2 > d1 && [4, 6, 8].includes(d2));
    if (i === 0) assert.equal(d1, 2);
    if (i === 1) assert.ok([3, 4].includes(d1));
    assert.ok([2, 3, 4, 6].includes(d1));
  },
  'g3-fraction-compare': ({ p, i }) => {
    const m = /^(\d+)\/(\d+) __ (\d+)\/(\d+)$/.exec(p.prompt);
    const [n1, d1, n2, d2] = m.slice(1).map(Number);
    const sameDen = d1 === d2;
    const sameNum = n1 === n2;
    assert.ok(sameDen !== sameNum, 'exactly one of numerator/denominator shared');
    for (const d of [d1, d2]) assert.ok([2, 3, 4, 6, 8].includes(d));
    assert.ok(n1 < d1 && n2 < d2);
    if (i === 0) assert.ok(sameDen);
    if (i === 1) assert.ok(sameNum);
  },
  'g3-money-dollars': ({ p, i }) => {
    const total = oracle(p).num;
    assert.ok(i === 0 ? total <= 20 * 100 : total <= 20);
    if (i >= 1) assert.ok(/\$\d+ bill|1 dollar/.test(p.prompt));
    if (i === 1) assert.ok(!/nickel|penn/.test(p.prompt));
  },
  'g4-add-sub-large': ({ p, i }) => {
    const { a, b, op } = bin(p.prompt);
    const len = [4, 4, 5, 6][i];
    assert.equal(String(a).length, len);
    assert.equal(String(b).length, len);
    if (op === '+') {
      assert.ok(a + b <= 1000000);
      if (i === 0) assert.equal(carries(a, b), 0);
      if (i === 1) assert.ok(carries(a, b) >= 1);
    } else {
      assert.ok(a >= b);
      if (i === 0) assert.equal(borrows(a, b), 0);
      if (i === 1) assert.ok(borrows(a, b) >= 1);
      if (i === 3) assert.ok(/0/.test(String(a).slice(1, -1)) && borrows(a, b) >= 2);
    }
  },
  'g4-mult-10-100': ({ p, i }) => {
    const [a, b] = mult(p.prompt);
    const other = [a, b].includes(10) && i !== 1 ? (a === 10 ? b : a) : a === 100 ? b : a;
    if (i === 0) assert.ok([a, b].includes(10));
    if (i === 1) assert.ok([a, b].includes(100));
    if (i === 2) assert.ok(([a, b].includes(10) || [a, b].includes(100)) && other >= 100);
    inR(other, 2, 999, 'other');
  },
  'g4-mult-11-15': ({ p, i }) => {
    const [a, b] = mult(p.prompt);
    if (i === 3) {
      assert.equal(a, b);
      inR(a, 11, 15, 'square');
    } else {
      inR(a, 1, 12, 'a');
      inR(b, 1, 12, 'b');
      const bs = [[11], [12], [11, 12]][i];
      if (i < 2) assert.ok(bs.includes(a) || bs.includes(b));
    }
  },
  'g4-mult-multi-by-1': ({ p, params, i }) => {
    const { a, b } = bin(p.prompt);
    assert.equal(String(a).length, [2, 3, 4, 4][i]);
    inR(b, 2, 9, 'b');
    assert.ok(a * b < 100000);
    if (i === 3) assert.match(String(a), /^.*0.*.$/);
  },
  'g4-mult-2x2': ({ p, i }) => {
    const [a, b] = mult(p.prompt);
    inR(a, 11, 99, 'a');
    inR(b, 11, 99, 'b');
    if (i === 0) assert.ok(isMult10(a) || isMult10(b));
    if (i === 1) assert.ok((a >= 11 && a <= 19) || (b >= 11 && b <= 19));
  },
  'g4-div-1digit': ({ p, params, i }) => {
    const { a, b } = bin(p.prompt);
    inR(b, 2, 9, 'divisor');
    assert.ok(Math.floor(a / b) >= 10, 'quotient >= 10');
    const rem = a % b;
    if (!params.remainder) assert.equal(rem, 0);
    if (params.remainder) assert.equal(p.answerType, 'quotient_remainder');
    const len = String(a).length;
    if (i === 0) assert.equal(len, 2);
    if (i === 1) assert.equal(len, 3);
    if (i === 2) assert.ok(len === 2 || len === 3);
    if (i === 3) assert.equal(len, 4);
  },
  'g4-estimate': ({ p, params }) => {
    const m = /\(nearest ([\d,]+)\)/.exec(p.prompt);
    assert.equal(num(m[1]), params.place);
    assert.ok(params.ops.some((o) => (o === 'mul' ? 'x' : o === 'add' ? '+' : '-') === /([+\-x])/.exec(p.prompt.replace(/^Estimate /, '').replace(/^[\d,]+ /, ''))[1]));
  },
  'g4-factors-multiples': ({ p, i }) => {
    const m = /^Is (\d+) a factor of (\d+)\?$/.exec(p.prompt);
    if (i === 2) return assert.match(p.prompt, /^Smallest multiple/);
    const [k, n] = [+m[1], +m[2]];
    inR(n, 6, 100, 'n');
    assert.ok(i === 0 ? [2, 3, 4, 5, 10].includes(k) : k >= 2 && k <= 12);
  },
  'g4-fraction-equiv': ({ p, i }) => {
    if (i < 2) {
      const m = /^(\d+)\/(\d+) = __\/(\d+)$/.exec(p.prompt);
      const [n, d1, d2] = [+m[1], +m[2], +m[3]];
      const f = d2 / d1;
      assert.ok(Number.isInteger(f) && d2 <= 100);
      inR(f, 2, i === 0 ? 3 : 6, 'factor');
      assert.ok(n < d1 && d1 >= 2 && d1 <= 10);
    } else {
      const m = /^(\d+)\/(\d+) = (\d+)\/__$/.exec(p.prompt);
      const [N1, D1, n] = [+m[1], +m[2], +m[3]];
      const f = N1 / n;
      assert.ok(Number.isInteger(f) && f >= 2 && f <= 6 && D1 / f === Number(p.answer));
      assert.equal(gcdT(n, Number(p.answer)), 1, 'simplified fraction');
    }
  },
  'g4-fraction-compare': ({ p, i }) => {
    const [n1, d1, n2, d2] = /^(\d+)\/(\d+) __ (\d+)\/(\d+)$/.exec(p.prompt).slice(1).map(Number);
    for (const d of [d1, d2]) inR(d, 2, 12, 'den');
    assert.ok(!(n1 === n2 && d1 === d2));
    if (i === 0) assert.ok((n1 === 1 && d1 === 2) || (n2 === 1 && d2 === 2));
    if (i === 1) assert.ok(d1 % d2 === 0 || d2 % d1 === 0);
  },
  'g4-fraction-add-sub': ({ p, i }) => {
    const m = /^(\d+)\/(\d+) ([+-]) (\d+)\/(\d+) = __$/.exec(p.prompt);
    const [n1, d1, op, n2, d2] = [+m[1], +m[2], m[3], +m[4], +m[5]];
    assert.equal(d1, d2);
    inR(d1, 2, 12, 'den');
    assert.ok(n1 >= 1 && n2 >= 1 && n1 < d1 + 1);
    const v = op === '+' ? (n1 + n2) / d1 : (n1 - n2) / d1;
    if (i === 0) assert.ok(op === '+' && v <= 1);
    if (i === 1) assert.ok(op === '-' && v > 0);
    if (i === 2) assert.ok(op === '+' && v > 1);
  },
  'g4-decimals-frac': ({ p, i }) => {
    if (i < 2) {
      const m = /(\d+)\/(\d+)|^([\d.]+) = __\/(\d+)/.exec(p.prompt);
      const den = +(m[2] || m[4]);
      assert.equal(den, i === 0 ? 10 : 100);
      const n = m[1] ? +m[1] : Math.round(+m[3] * den);
      inR(n, 1, den - 1, 'numerator');
      if (i === 1) assert.notEqual(n % 10, 0);
    } else {
      const [x, y] = /\? __$/.test(p.prompt) ? p.prompt.match(/0\.\d+/g) : [];
      assert.ok(x && y && x !== y);
      assert.deepEqual([x.length, y.length].sort(), [3, 4]);
      assert.ok(Number(x) !== Number(y));
    }
  },
  'g4-decimal-add-sub': ({ p, i }) => decAddSub(p, i, 99.99),
  'g5-decimal-add-sub': ({ p, i }) => decAddSub(p, i, 99.99),
  'g5-decimal-place-round': ({ p, i }) => {
    if (i === 0) {
      const m = /^Value of the (\d) in (\d+)\.(\d{3}) = __$/.exec(p.prompt);
      assert.ok(m, p.prompt);
      assert.notEqual(m[1], '0');
      assert.equal((m[2] + m[3]).split(m[1]).length, 2, 'digit is unique');
    } else {
      const m = /^Round ([\d.]+) to the nearest (tenth|hundredth)/.exec(p.prompt);
      assert.equal(m[2], i === 1 ? 'tenth' : 'hundredth');
      const pl = places(m[1]);
      inR(+m[1], 0.001, 99.999, 'n');
      assert.ok(pl >= (i === 1 ? 2 : 3));
    }
  },
  'g5-powers-of-10': ({ p, i }) => {
    if (i === 3) return inR(Number(p.answer), 100, 1000000, 'power');
    const m = /^([\d.]+) ([x/]) (\d+) = __$/.exec(p.prompt);
    assert.ok(['10', '100', '1000'].includes(m[3]));
    if (i === 0) assert.ok(!m[1].includes('.') && m[2] === 'x');
    if (i === 1) assert.ok(m[1].includes('.') && m[2] === 'x');
    if (i === 2) assert.equal(m[2], '/');
  },
  'g5-mult-3x2': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    if (i === 0) {
      inR(a, 10, 99, 'a');
      inR(b, 10, 99, 'b');
    } else {
      inR(a, 100, 999, 'a');
      inR(b, 10, 99, 'b');
      assert.equal(/0/.test(String(a)), i === 2);
    }
  },
  'g5-div-2digit': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(b, 11, 99, 'divisor');
    inR(a, 100, 9999, 'dividend');
    if (i === 0) assert.ok(isMult10(b) && a % b === 0);
    if (i === 1) assert.equal(a % b, 0);
    if (i === 2) assert.equal(p.answerType, 'quotient_remainder');
  },
  'g5-decimal-mult': ({ p, i }) => {
    const { a, b, ra, rb } = bin(p.prompt);
    const pa = places(ra);
    const pb = places(rb);
    assert.ok(pa + pb <= 4);
    if (i === 0) assert.ok(pa === 0 || pb === 0);
    if (i === 1) assert.ok(pa === 1 && pb === 1);
    if (i === 2) assert.ok(pa === 2 || pb === 2);
  },
  'g5-decimal-div': ({ p, i }) => {
    const { a, b, ra } = bin(p.prompt);
    const q = a / b;
    assert.ok(Math.abs(q * 100 - Math.round(q * 100)) < 1e-6, 'terminates in <= 2 places');
    if (i === 0) {
      inR(b, 2, 9, 'divisor');
      assert.ok(ra.includes('.'));
    }
    if (i === 1) {
      assert.ok(!ra.includes('.'));
      assert.notEqual(a % b, 0);
    }
    if (i === 2) inR(b, 10, 99, 'divisor');
    inR(a, 0.1, 999.99, 'dividend');
  },
  'g5-fraction-add-sub-unlike': ({ p, i }) => {
    const dens = [...p.prompt.matchAll(/\/(\d+)/g)].map((x) => +x[1]);
    assert.equal(dens.length, 2);
    const [d1, d2] = dens;
    dens.forEach((d) => inR(d, 2, 12, 'den'));
    const mult = d1 % d2 === 0 || d2 % d1 === 0;
    if (i === 0) assert.ok(mult && d1 !== d2);
    if (i === 1) assert.ok(!mult);
    if (i === 2) {
      assert.equal(gcdT(d1, d2), 1);
      assert.ok(p.requireSimplest);
    }
    assert.ok(Number(oracle(p).num) > 0);
  },
  'g5-fraction-mult-whole': ({ p, i }) => {
    const m = /(\d+)\/(\d+)/.exec(p.prompt);
    const w = nums(p.prompt.replace(/\d+\/\d+/, ''))[0];
    inR(w, 2, 12, 'whole');
    inR(+m[2], 2, 10, 'den');
    assert.ok(+m[1] < +m[2]);
    if (i === 0) assert.equal(+m[1], 1);
    if (i === 2) assert.ok(p.requireSimplest && /simplest form/.test(p.prompt));
  },
  'g5-unit-fraction-division': ({ p, i }) => {
    const m = /(\d+)\/(\d+)/.exec(p.prompt);
    assert.equal(+m[1], 1);
    inR(+m[2], 2, 10, 'den');
    const wholeFirst = /^\d+ \/ 1\//.test(p.prompt);
    if (i === 0) assert.ok(wholeFirst);
    if (i === 1) assert.ok(!wholeFirst);
  },
  'g5-order-of-ops': ({ p, i }) => {
    const left = lhs(p.prompt);
    const parens = (left.match(/\(/g) || []).length;
    assert.equal(parens, i);
    const v = Number(p.answer);
    assert.ok(Number.isInteger(v) && v >= 0);
    const terms = (left.match(/\d+/g) || []).length;
    inR(terms, 3, 5, 'terms');
    inR(Math.max(...nums(left)), 1, 20, 'values');
  },
  'g5-prime-composite': ({ p, params }) => inR(nums(p.prompt)[0], 2, params.max, 'n'),
  'g6-fraction-mult': ({ p, i }) => {
    const fr = (p.prompt.match(/\d+\/\d+/g) || []).length;
    const mixed = (p.prompt.match(/\d+ \d+\/\d+/g) || []).length;
    if (i === 0) assert.ok(fr === 2 && mixed === 0);
    if (i === 1) assert.equal(mixed, 1);
    if (i === 2) assert.equal(mixed, 2);
  },
  'g6-fraction-div': ({ p, i }) => {
    const mixed = (p.prompt.match(/\d+ \d+\/\d+/g) || []).length;
    if (i === 0) assert.match(p.prompt, /^1\/\d+ \/ 1\/\d+ = __$/);
    if (i === 2) assert.equal(mixed, 1);
    const [n, d] = p.answer.includes('/') ? p.answer.split('/').map(Number) : [Number(p.answer), 1];
    assert.ok(n <= 24 && d <= 12, 'simple result');
  },
  'g6-div-multi-digit': ({ p, i }) => {
    const { a, b } = bin(p.prompt);
    inR(b, 11, 99, 'divisor');
    if (i === 0) {
      inR(a, 1000, 9999, 'dividend');
      assert.equal(a % b, 0);
    }
    if (i === 1) {
      inR(a, 10000, 99999, 'dividend');
      assert.equal(a % b, 0);
    }
    if (i === 2) {
      inR(a, 1000, 99999, 'dividend');
      assert.notEqual(a % b, 0);
      assert.ok(places(p.answer) <= 2 && places(p.answer) >= 1);
    }
  },
  'g6-decimal-ops': ({ p, i }) => {
    const { a, b, op, ra, rb } = bin(p.prompt);
    assert.ok(places(ra) <= 3 && places(rb) <= 3);
    assert.ok(places(p.answer) <= 4);
    assert.ok(Number(p.answer) >= 0);
    if (i === 0) assert.ok('+-'.includes(op) && Math.max(places(ra), places(rb)) === 3);
    if (i === 1) assert.equal(op, 'x');
    if (i === 2) assert.ok(op === '/' && !rb.includes('.'));
    if (i === 3) assert.ok(op === '/' && rb.includes('.'));
  },
  'g6-integers-opp-abs': ({ p, i }) => {
    for (const n of nums(p.prompt)) inR(n, 0, 100, 'magnitude');
    if (i === 0) assert.match(p.prompt, /^Opposite of -?\d+ = __$/);
    if (i === 1) assert.match(p.prompt, /^\|-?\d+\| = __$/);
    if (i === 2) assert.match(p.prompt, /\|/);
  },
  'g6-integer-add-sub': ({ p, i }) => {
    const m = /^(-?\d+) ([+-]) (\(?-?\d+\)?) = __$/.exec(p.prompt);
    const a = +m[1];
    const b = num(m[3]);
    const lim = i === 3 ? 100 : 20;
    inR(Math.abs(a), 1, lim, 'a');
    inR(Math.abs(b), 1, lim, 'b');
    if (b < 0) assert.match(m[3], /^\(/);
    if (i === 0) assert.ok(m[2] === '+' && a * b < 0);
    if (i === 1) assert.ok(m[2] === '+' && a < 0 && b < 0);
    if (i === 2) assert.equal(m[2], '-');
  },
  'g6-integer-mul-div': ({ p, i }) => {
    const m = /^(-?\d+) ([x/]) (\(?-?\d+\)?) = __$/.exec(p.prompt);
    const a = +m[1];
    const b = num(m[3]);
    assert.notEqual(b, 0);
    const neg = (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0);
    if (m[2] === 'x') {
      inR(Math.abs(a), 2, 12, 'a');
      inR(Math.abs(b), 2, 12, 'b');
    } else {
      assert.ok(a % b === 0);
      inR(Math.abs(b), 2, 12, 'divisor');
      inR(Math.abs(a / b), 2, 12, 'quotient');
    }
    if (i === 0) assert.ok(neg === 1 && m[2] === 'x');
    if (i === 1) assert.ok(neg === 2 && m[2] === 'x');
    if (i === 2) assert.equal(m[2], '/');
  },
  'g6-fraction-decimal-percent': ({ p, i }) => {
    if (i === 1) assert.match(p.prompt, /^0\.\d+ = __ %$/);
    else {
      const m = /^(\d+)\/(\d+)/.exec(p.prompt);
      const key = `${m[1]}/${m[2]}`;
      const set1 = ['1/2', '1/4', '3/4', '1/5', '2/5', '3/5', '4/5', '1/10', '3/10', '7/10', '9/10'];
      if (i === 0) assert.ok(set1.includes(key), key);
      else assert.ok(['1/8', '3/8', '5/8', '7/8', '1/3', '2/3'].includes(key), key);
      if (m[2] === '3') assert.match(p.prompt, /nearest whole number/);
    }
  },
  'g6-percent-of': ({ p, params }) => {
    const m = /^(\d+)% of (\d+) = __$/.exec(p.prompt);
    assert.ok(params.percent.includes(+m[1]));
    inR(+m[2], 10, 400, 'n');
    assert.ok(places(p.answer) <= 2);
  },
  'g6-ratio-unit-rate': ({ p, i }) => {
    if (i === 0) {
      const m = /^(\d+) : (\d+) = (\d+) : __$/.exec(p.prompt);
      assert.equal((+m[3] % +m[1]), 0);
      assert.ok(+m[3] / +m[1] >= 2);
    } else {
      const m = /^\$?(\d+) (?:\w+ )?(?:for|in) (\d+) /.exec(p.prompt);
      const total = +m[1];
      const c = +m[2];
      if (i === 1) assert.equal(total % c, 0);
      else {
        assert.notEqual(total % c, 0);
        assert.ok(places(p.answer) <= 2);
      }
    }
  },
  'g6-exponents': ({ p, i }) => {
    const v = Number(p.answer);
    inR(v, 0, 10000, 'result');
    if (i === 0) {
      const m = /^(\d+)\^([23]) = __$/.exec(p.prompt);
      assert.ok(m, p.prompt);
    }
    if (i === 1) {
      const m = /^([23])\^([2-5]) = __$/.exec(p.prompt);
      assert.ok(m, p.prompt);
    }
    if (i === 2) assert.ok(/\^/.test(p.prompt) && /[+x-]|\(/.test(p.prompt));
  },
  'g6-gcf-lcm': ({ p, params }) => {
    const m = /^(GCF|LCM) of (\d+) and (\d+)/.exec(p.prompt);
    assert.equal(m[1], params.mode.toUpperCase());
    inR(+m[2], 2, params.max, 'a');
    inR(+m[3], 2, params.max, 'b');
    assert.notEqual(m[2], m[3]);
  },
  'g6-one-step-equations': ({ p, params, i }) => {
    const form = /^x \+ /.test(p.prompt) ? 'add' : /^x - /.test(p.prompt) ? 'sub' : /^\d+x /.test(p.prompt) ? 'mul' : 'div';
    if (params.forms) assert.ok(params.forms.includes(form), p.prompt);
    assert.ok(Number.isInteger(Number(p.answer)) && Number(p.answer) >= 1);
  },
};

function coinCheck(maxCents, [minCoins, maxCoins]) {
  return ({ p, params }) => {
    let coins = 0;
    let total = 0;
    for (const t of p.prompt.matchAll(/(\d+) (pennies|penny|nickels?|dimes?|quarters?)/g)) {
      coins += +t[1];
      total += +t[1] * COIN_VAL[t[2]];
      const kind = t[2].replace(/ies$/, 'y').replace(/s$/, '');
      if (params.coins) assert.ok(params.coins.includes(kind), `${kind} not allowed`);
    }
    inR(coins, minCoins, maxCoins, 'coin count');
    assert.ok(total <= maxCents);
  };
}
function addBig(p, mode, lo, max) {
  const { a, b } = bin(p.prompt);
  inR(a, lo, 900, 'a');
  inR(b, mode === 'x100' ? 100 : lo, 900, 'b');
  assert.ok(a + b <= max);
  if (mode === 'x100') return assert.ok(a % 100 === 0 && b % 100 === 0);
  assert.equal(carries(a, b), mode, p.prompt);
}
function subBig(p, mode, subLo) {
  const { a, b } = bin(p.prompt);
  inR(a, 200, 999, 'minuend');
  inR(b, subLo, 900, 'subtrahend');
  assert.ok(a - b >= 0);
  if (mode === 'x100') return assert.ok(a % 100 === 0 && b % 100 === 0 && a > b);
  assert.equal(borrows(a, b), mode, p.prompt);
}
function decAddSub(p, i, max) {
  const { a, b, op, ra, rb } = bin(p.prompt);
  inR(a, 0.01, max, 'a');
  assert.ok(Number(p.answer) > 0, 'positive result');
  const [pa, pb] = [places(ra), places(rb)];
  if (i === 0) assert.ok(pa === 2 && pb === 2);
  if (i === 1) assert.ok(pa !== pb && pa >= 1 && pb >= 1);
  if (i === 2) assert.ok(pa === 0 && op === '-' && b < a);
}

export function skipCountCheck() {}
