// Grades 1-3 whole-number generators: counting, place value, add/sub, money, rounding, compare.
import { B, C, eq, seq } from '../build.js';
import { N, retry, addCarries, subBorrows, maybeSwap, canon, roundTo } from '../util.js';

const R = {}; // skillId -> handler(rng, { params, index })
export const handlers = R;

// ---------- counting ----------
R['g1-count-seq'] = (rng, { params }) => {
  const [lo, hi] = params.n;
  const cross = params.crossHundred && rng.chance(0.4);
  const form = rng.pick(['after', 'before', 'seq', 'seq']);
  if (form === 'after') {
    const n = cross ? rng.pick([99, 100]) : rng.int(lo, hi - 1);
    return { items: [`What comes after ${n}?`], answer: n + 1, meta: { form, n } };
  }
  if (form === 'before') {
    const n = cross ? rng.pick([100, 101]) : rng.int(lo + 1, hi);
    return { items: [`What comes before ${n}?`], answer: n - 1, meta: { form, n } };
  }
  const s = cross ? rng.pick([98, 99, 100]) : rng.int(lo, hi - 2);
  const terms = [s, s + 1, s + 2];
  const miss = rng.int(0, 2);
  const shown = terms.map((t, i) => (i === miss ? B : String(t)));
  return { items: seq(shown, ', '), answer: terms[miss], meta: { form, terms, miss } };
};

function skipCount(rng, { steps, startMax, maxTerm, offset }) {
  const step = rng.pick(steps);
  const maxStart = Math.min(startMax, maxTerm - 3 * step);
  const k = rng.int(offset ? 1 : 0, Math.floor(maxStart / step));
  const s = k * step;
  const terms = [s, s + step, s + 2 * step];
  const answer = s + 3 * step;
  return {
    items: [...seq(terms.map(N), ', '), ', ', B],
    answer,
    meta: { step, terms, answer },
  };
}
R['g1-skip-count'] = (rng, { params }) =>
  skipCount(rng, { steps: params.step, startMax: 100, maxTerm: 120, offset: !!params.offsetStart });
R['g2-skip-count'] = (rng, { params }) =>
  skipCount(rng, { steps: params.step, startMax: 900, maxTerm: params.max || 1000, offset: false });

R['g1-ten-more-less'] = (rng, { params }) => {
  const [lo, hi] = params.n;
  const wantCross = params.crossHundred && rng.chance(0.35);
  const more = rng.chance(0.5);
  let n;
  if (wantCross) n = more ? rng.int(90, 99) : rng.int(100, 109);
  else
    n = retry(() => {
      const c = rng.int(lo, hi);
      if (more && c + 10 > hi) return null;
      if (!more && c < 10) return null;
      if (!params.crossHundred && Math.floor(c / 100) !== Math.floor((more ? c + 10 : c - 10) / 100)) return null;
      return c + 1;
    }) - 1;
  const answer = more ? n + 10 : n - 10;
  return { items: [`10 ${more ? 'more' : 'less'} than ${n} = `, B], answer, meta: { n, more } };
};

// ---------- place value ----------
R['g1-place-value'] = (rng, { params, index }) => {
  const max = params.max || 120;
  const lo = 11;
  const forms = index === 1 ? ['expanded'] : index === 0 ? ['tensOnes', 'howMany'] : ['tensOnes', 'expanded', 'howMany'];
  const form = rng.pick(forms);
  const n = retry(() => {
    const c = rng.int(index === 2 && rng.chance(0.5) ? 100 : lo, max);
    if (form !== 'howMany' && c % 10 === 0) return null;
    return c;
  });
  const T = Math.floor(n / 10);
  const O = n % 10;
  if (form === 'tensOnes')
    return { items: eq(`${T} tens ${O} ones`), answer: n, meta: { form, T, O } };
  if (form === 'expanded') return { items: eq(`${T * 10} + ${O}`), answer: n, meta: { form, T, O } };
  return { items: [`How many tens in ${n}?`], answer: T, meta: { form, n } };
};

R['g2-place-value'] = (rng, { index }) => {
  if (index === 2) {
    // value of a digit; digits distinct so the question is unambiguous
    const n = retry(() => {
      const c = rng.int(100, 999);
      const d = String(c).split('');
      return new Set(d).size === 3 ? c : null;
    });
    const s = String(n);
    const pos = rng.pick([0, 1, 2].filter((p) => s[p] !== '0'));
    const digit = Number(s[pos]);
    const place = [100, 10, 1][pos];
    return { items: [`What is the value of the ${digit} in ${n}? `, B], answer: digit * place, meta: { n, digit } };
  }
  const zeros = index === 1;
  const H = rng.int(1, 9);
  let T;
  let O;
  if (zeros) {
    [T, O] = rng.pick([
      [0, rng.int(1, 9)],
      [rng.int(1, 9), 0],
      [0, 0],
    ].slice(0, rng.chance(0.1) ? 3 : 2));
  } else {
    T = rng.int(1, 9);
    O = rng.int(1, 9);
  }
  const n = H * 100 + T * 10 + O;
  const form = rng.pick(['words', 'expanded']);
  return form === 'words'
    ? { items: eq(`${H} hundreds ${T} tens ${O} ones`), answer: n, meta: { form, H, T, O } }
    : { items: eq(`${H * 100} + ${T * 10} + ${O}`), answer: n, meta: { form, H, T, O } };
};

// ---------- compare ----------
function compareAns(a, b) {
  return a < b ? '<' : a > b ? '>' : '=';
}
function cmpOut(a, b, meta) {
  return { items: [`${a} `, B, ` ${b}`], answer: compareAns(a, b), answerType: 'symbol', meta: { a, b, ...meta } };
}
R['g1-compare'] = (rng, { index }) => {
  const sameTens = index === 1 || (index === 2 && rng.chance(0.5));
  const wantEqual = index > 0 && rng.chance(0.15);
  let a;
  let b;
  if (wantEqual) {
    a = rng.int(0, 100);
    b = a;
  } else {
    [a, b] = retry(() => {
      const x = rng.int(0, 100);
      const y = rng.int(0, 100);
      if (x === y) return null;
      const tensSame = Math.floor(x / 10) === Math.floor(y / 10);
      if (index === 0 ? tensSame : sameTens ? !tensSame : tensSame) return null;
      return [x, y];
    });
  }
  return cmpOut(a, b);
};
R['g2-compare-1000'] = (rng, { params }) => {
  const at = params.differAt;
  const eqPair = at === 'ones' && rng.chance(0.15);
  const h = rng.int(1, 9);
  const t = rng.int(0, 9);
  const o = rng.int(0, 9);
  let a = h * 100 + t * 10 + o;
  let b;
  if (eqPair) b = a;
  if (at === 'hundreds') {
    const h2 = retry(() => {
      const x = rng.int(1, 9);
      return x !== h ? x : null;
    });
    b = h2 * 100 + rng.int(0, 99);
  } else if (at === 'tens') {
    const t2 = retry(() => {
      const x = rng.int(0, 9);
      return x !== t ? x : null;
    });
    b = h * 100 + t2 * 10 + rng.int(0, 9);
  } else if (!eqPair) {
    const o2 = retry(() => {
      const x = rng.int(0, 9);
      return x !== o ? x : null;
    });
    b = h * 100 + t * 10 + o2;
  }
  [a, b] = rng.chance(0.5) ? [a, b] : [b, a];
  return cmpOut(a, b);
};

// ---------- add / sub within 20 ----------
const pair = (rng, a, b) => maybeSwap(rng, a, b);
const addOut = (a, b, meta) => ({ items: eq(`${N(a)} + ${N(b)}`), answer: a + b, meta: { a, b, ...meta } });
const subOut = (a, b, meta) => ({ items: eq(`${N(a)} - ${N(b)}`), answer: a - b, meta: { a, b, ...meta } });

R['g1-add-10'] = (rng, { index }) => {
  if (index === 0) {
    const b = rng.int(0, 1);
    const a = rng.int(b === 0 ? 1 : 0, 10 - b);
    return addOut(...pair(rng, a, b));
  }
  if (index === 1) {
    const a = rng.int(1, 5);
    return addOut(a, a);
  }
  if (index === 2) {
    const s = rng.int(2, 5);
    const a = rng.int(1, s - 1);
    return addOut(...pair(rng, a, s - a));
  }
  if (rng.chance(0.35)) {
    const a = rng.int(1, 9);
    return addOut(...pair(rng, a, 10 - a));
  }
  const s = rng.int(2, 10);
  const a = rng.int(1, s - 1);
  return addOut(...pair(rng, a, s - a));
};
R['g1-sub-10'] = (rng, { index }) => {
  if (index < 2) {
    const m = index === 0 ? rng.int(2, 5) : rng.int(3, 10);
    return subOut(m, rng.int(1, m));
  }
  const m = rng.int(3, 10);
  const s = rng.chance(0.5) ? rng.pick([0, 1, m]) : rng.int(2, m - 1);
  return subOut(m, s);
};
R['g1-add-20'] = (rng, { index }) => {
  if (index === 0) {
    const a = rng.int(6, 9);
    return addOut(a, a);
  }
  if (index === 1) {
    const b = rng.pick([8, 9]);
    return addOut(...pair(rng, rng.int(11 - b, 9), b));
  }
  if (index === 2) {
    const n = rng.int(5, 8);
    return addOut(...pair(rng, n, n + 1));
  }
  const [a, b] = retry(() => {
    const x = rng.int(2, 9);
    const y = rng.int(2, 9);
    return x + y >= 11 ? [x, y] : null;
  });
  return addOut(a, b);
};
R['g1-sub-20'] = (rng, { index }) => {
  if (index === 0) {
    const k = rng.int(6, 9);
    return subOut(2 * k, k);
  }
  if (index === 1) {
    const s = rng.pick([8, 9]);
    return subOut(rng.int(Math.max(11, s + 2), 18), s);
  }
  const m = rng.int(11, 18);
  return subOut(m, rng.int(2, Math.min(9, m - 2)));
};
R['g2-add-20'] = (rng, { index }) => {
  if (index === 0) {
    const s = rng.int(2, 10);
    const a = rng.int(1, s - 1);
    return addOut(...pair(rng, a, s - a));
  }
  if (index === 1) {
    const a = rng.int(1, 9);
    return addOut(...pair(rng, a, rng.chance(0.5) ? a : Math.min(10, a + 1)));
  }
  if (index === 2) {
    const b = rng.pick([8, 9]);
    return addOut(...pair(rng, rng.int(Math.max(2, 11 - b), 10 - (b === 8 ? 0 : 1)), b));
  }
  const [a, b] = retry(() => {
    const x = rng.int(1, 10);
    const y = rng.int(1, 10);
    const s = x + y;
    if (s > 18) return null;
    if (s < 11 && !rng.chance(0.3)) return null;
    return [x, y];
  });
  return addOut(a, b);
};
R['g2-sub-20'] = (rng, { index }) => {
  const [lo, hi] = [[3, 10], [11, 14], [15, 18]][index];
  const m = rng.int(lo, hi);
  return subOut(m, rng.int(1, Math.min(9, m)));
};

R['g1-missing-number'] = (rng, { params }) => {
  const max = params.max;
  const form = params.position === 'addend2' ? 'addend2' : rng.pick(['addend2', 'addend1', 'subResult', 'subMinuend']);
  const c = rng.int(3, max);
  const a = rng.int(1, c - 1);
  const b = c - a;
  if (form === 'addend2') return { items: [`${a} + `, B, ` = ${c}`], answer: b, meta: { form, a, b, c } };
  if (form === 'addend1') return { items: [B, ` + ${b} = ${c}`], answer: a, meta: { form, a, b, c } };
  if (form === 'subResult') return { items: [`${c} - `, B, ` = ${a}`], answer: b, meta: { form, a, b, c } };
  return { items: [B, ` - ${b} = ${a}`], answer: c, meta: { form, a, b, c } };
};

R['g1-add-sub-tens'] = (rng, { index }) => {
  if (index === 0) {
    const a = rng.int(1, 8) * 10;
    return addOut(...pair(rng, a, rng.int(1, (100 - a) / 10) * 10));
  }
  if (index === 1) {
    const a = rng.int(2, 9) * 10;
    return subOut(a, rng.int(1, a / 10 - 1) * 10);
  }
  const a = retry(() => {
    const c = rng.int(11, 98);
    return c % 10 !== 0 && c % 10 <= 8 ? c : null;
  });
  const b = rng.int(1, 9 - (a % 10));
  return addOut(a, b);
};

// ---------- money ----------
const COIN = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const COIN_ORDER = ['quarter', 'dime', 'nickel', 'penny'];

function coinSet(rng, types, minCoins, maxCoins, newest, maxCents) {
  return retry(() => {
    const n = rng.int(minCoins, maxCoins);
    const counts = {};
    for (let i = 0; i < n; i++) {
      const t = rng.pick(types);
      counts[t] = (counts[t] || 0) + 1;
    }
    const kinds = Object.keys(counts);
    if (kinds.length < 2 && !rng.chance(0.1)) return null;
    if (newest && !counts[newest] && !rng.chance(0.3)) return null;
    const total = kinds.reduce((s, k) => s + COIN[k] * counts[k], 0);
    return total <= maxCents ? counts : null;
  });
}
const coinItems = (counts) =>
  seq(
    COIN_ORDER.filter((k) => counts[k]).map((k) => C(k, counts[k])),
    ' + ',
  );
const coinTotal = (counts) => Object.keys(counts).reduce((s, k) => s + COIN[k] * counts[k], 0);

R['g1-coins'] = (rng, { params, index }) => {
  const counts = coinSet(rng, params.coins, 2, 5, [null, 'nickel', 'quarter'][index], 100);
  const total = coinTotal(counts);
  return { items: [...coinItems(counts), ' = ', B, ' cents'], answer: total, meta: { counts } };
};
R['g2-money-cents'] = (rng, { params, index }) => {
  const types = params.coins || ['quarter', 'dime', 'nickel', 'penny'];
  const counts = coinSet(rng, types, 3, 6, index === 0 ? 'nickel' : 'quarter', 100);
  const total = coinTotal(counts);
  if (index === 2)
    return {
      items: [...coinItems(counts), ' = $', B],
      answer: canon(total, 2),
      answerType: 'decimal',
      keypad: { decimal: true },
      meta: { counts, dollars: true },
    };
  return { items: [...coinItems(counts), ' = ', B, ' cents'], answer: total, meta: { counts } };
};
R['g3-money-dollars'] = (rng, { params, index }) => {
  if (index === 0) {
    const counts = coinSet(rng, ['quarter', 'dime', 'nickel', 'penny'], 3, 6, null, 2000);
    return {
      items: [...coinItems(counts), ' = ', B, ' cents'],
      answer: coinTotal(counts),
      keypad: { decimal: false },
      meta: { counts },
    };
  }
  const types = index === 1 ? ['quarter', 'dime'] : ['quarter', 'dime', 'nickel', 'penny'];
  const bill = rng.pick([1, 5, 10]);
  const counts = retry(() => {
    const kinds = rng.shuffle(types).slice(0, rng.int(1, 2));
    const cs = {};
    for (const k of kinds) cs[k] = rng.int(1, 4);
    if (index === 2 && !(cs.nickel || cs.penny) && rng.chance(0.6)) return null;
    return cs;
  });
  const total = bill * 100 + coinTotal(counts);
  return {
    items: [bill === 1 ? '1 dollar + ' : `$${bill} bill + `, ...coinItems(counts), ' = $', B],
    answer: canon(total, 2),
    answerType: 'decimal',
    answerDisplay: (total / 100).toFixed(2),
    meta: { bill, counts },
  };
};

// ---------- 2-digit / 3-digit add and subtract ----------
R['g2-add-2digit'] = (rng, { params, index }) => {
  if (index >= 2) {
    const count = params.count;
    const nums = retry(() => {
      const xs = Array.from({ length: count }, () => rng.int(10, 99));
      const s = xs.reduce((p, c) => p + c, 0);
      return s <= 100 ? xs : null;
    });
    return { items: eq(nums.join(' + ')), answer: nums.reduce((p, c) => p + c, 0), meta: { nums } };
  }
  const [a, b] = retry(() => {
    const x = rng.int(10, 99);
    const y = rng.int(10, 99);
    const ones = (x % 10) + (y % 10);
    if (x + y > 99) return null;
    if (index === 0 ? ones > 9 || ones === 0 : ones < 10) return null;
    return [x, y];
  });
  return addOut(a, b);
};
R['g2-sub-2digit'] = (rng, { index }) => {
  const [a, b] = retry(() => {
    if (index === 2) {
      const x = rng.int(2, 9) * 10;
      const y = rng.int(10, x - 1);
      return y % 10 !== 0 ? [x, y] : null;
    }
    const x = rng.int(20, 99);
    const y = rng.int(10, x - 1);
    const borrow = x % 10 < y % 10;
    return index === 0 ? (!borrow ? [x, y] : null) : borrow ? [x, y] : null;
  });
  return subOut(a, b);
};
R['g2-mental-10-100'] = (rng, { params }) => {
  const delta = params.delta[0];
  const cross = params.crossHundred;
  const more = rng.chance(0.5);
  const n = retry(() => {
    const c = rng.int(100, 900);
    const r = c % 100;
    if (delta === 100) return more ? (c + 100 <= 1000 ? c : null) : c - 100 >= 0 ? c : null;
    if (more) return cross ? (r >= 90 ? c : null) : r <= 80 ? c : null;
    return cross ? (r < 10 ? c : null) : r >= 10 ? c : null;
  });
  const ans = more ? n + delta : n - delta;
  return { items: eq(`${n} ${more ? '+' : '-'} ${delta}`), answer: ans, meta: { n, delta, more } };
};

function addByCarries(rng, lo, hi, carries, max) {
  return retry(() => {
    const x = rng.int(lo, hi);
    const y = rng.int(lo, hi);
    if (x + y > max) return null;
    return addCarries(x, y) === carries ? [x, y] : null;
  });
}
function subByBorrows(rng, mLo, mHi, sLo, sHi, borrows) {
  return retry(() => {
    const x = rng.int(mLo, mHi);
    const y = rng.int(sLo, sHi);
    if (y >= x) return null;
    if (subBorrows(x, y) !== borrows) return null;
    if (borrows === 2 && !rng.chance(0.3) && Math.floor((x % 100) / 10) !== 0) {
      return rng.chance(0.3) ? [x, y] : null;
    }
    return [x, y];
  });
}
R['g2-add-1000'] = (rng, { params, index }) => {
  if (index === 0) {
    const a = rng.int(1, 9) * 100;
    const b = rng.int(1, (1000 - a) / 100) * 100;
    return addOut(...pair(rng, a, b));
  }
  const [a, b] = addByCarries(rng, 100, 900, index - 1, 1000);
  return addOut(a, b);
};
R['g3-add-1000'] = (rng, { index }) => {
  const [a, b] = addByCarries(rng, 100, 900, index, 1000);
  return addOut(a, b);
};
R['g2-sub-1000'] = (rng, { index }) => {
  if (index === 0) {
    const a = rng.int(2, 9) * 100;
    return subOut(a, rng.int(1, a / 100 - 1) * 100);
  }
  const [a, b] = subByBorrows(rng, 200, 999, 10, 900, index - 1);
  return subOut(a, b);
};
R['g3-sub-1000'] = (rng, { index }) => {
  const [a, b] = subByBorrows(rng, 200, 999, 100, 900, index);
  return subOut(a, b);
};

// ---------- equal groups ----------
R['g2-equal-groups'] = (rng, { params }) => {
  const size = rng.pick(params.size);
  const groups = rng.int(2, 5);
  const form = rng.pick(['sum', 'groups', 'rows']);
  const items =
    form === 'sum'
      ? eq(Array(groups).fill(size).join(' + '))
      : form === 'groups'
        ? eq(`${groups} groups of ${size}`)
        : eq(`${groups} rows of ${size}`);
  return { items, answer: groups * size, meta: { groups, size, form } };
};

// ---------- rounding (whole numbers) ----------
export function roundWhole(rng, place, lo, hi) {
  return retry(() => {
    let n;
    const mode = rng.next();
    if (mode < 0.22) {
      // exact midpoint
      const k = rng.int(Math.ceil(lo / place), Math.floor(hi / place));
      n = k * place + place / 2;
    } else if (mode < 0.34 && place >= 10) {
      // 9-carry: digit at the rounding place is 9 and we round up
      const q = rng.int(Math.floor(lo / place / 10), Math.floor(hi / place / 10)) * 10 + 9;
      n = q * place + rng.int(Math.ceil(place / 2), place - 1);
    } else n = rng.int(lo, hi);
    if (n < lo || n > hi || n % place === 0 || n < place) return null;
    return n;
  });
}
const placeWord = (p) =>
  ({ 10: 'ten', 100: 'hundred', 1000: 'thousand', 10000: 'ten thousand', 100000: 'hundred thousand' })[p];
R['g3-round'] = (rng, { params, index }) => {
  const place = params.place;
  const [lo, hi] = index === 0 ? [11, 99] : index === 1 ? [100, 999] : [101, 999];
  const n = roundWhole(rng, place, lo, hi);
  return {
    items: eq(`Round ${N(n)} to the nearest ${place === 10 ? 10 : 100}`),
    answer: roundTo(n, place),
    meta: { n, place },
  };
};
R['g4-place-value-round'] = (rng, { params, index }) => {
  let place;
  let lo;
  let hi;
  if (index === 0) {
    place = rng.pick(params.place);
    [lo, hi] = [1000, 9999];
  } else if (index === 1) {
    place = 1000;
    [lo, hi] = [1000, 99999];
  } else {
    place = rng.pick([10, 100, 1000, 10000, 100000]);
    [lo, hi] = [Math.max(place, 10000), 999999];
  }
  const n = roundWhole(rng, place, lo, hi);
  return {
    items: eq(`Round ${N(n)} to the nearest ${placeWord(place)}`),
    answer: roundTo(n, place),
    meta: { n, place },
  };
};

// ---------- 4-6 digit add/sub ----------
R['g4-add-sub-large'] = (rng, { params, index }) => {
  const digits = params.digits;
  const lo = 10 ** (digits - 1);
  const hi = 10 ** digits - 1;
  const add = rng.chance(0.5);
  if (index === 3 && !add) {
    // subtract across zeros
    const [a, b] = retry(() => {
      const x = rng.int(lo, hi);
      const s = String(x);
      if (!/0/.test(s.slice(1, -1)) || s.endsWith('0') && rng.chance(0.5)) return null;
      const y = rng.int(lo, x - 1);
      return subBorrows(x, y) >= 2 ? [x, y] : null;
    });
    return { items: eq(`${N(a)} - ${N(b)}`), answer: a - b, meta: { a, b, op: '-' } };
  }
  const [a, b] = retry(() => {
    const x = rng.int(lo, hi);
    const y = rng.int(lo, hi);
    if (add) {
      if (x + y > 1000000) return null;
      const c = addCarries(x, y);
      return index === 0 ? (c === 0 ? [x, y] : null) : index === 1 ? (c >= 1 ? [x, y] : null) : [x, y];
    }
    if (y >= x) return null;
    const br = subBorrows(x, y);
    return index === 0 ? (br === 0 ? [x, y] : null) : index === 1 ? (br >= 1 ? [x, y] : null) : [x, y];
  });
  return { items: eq(`${N(a)} ${add ? '+' : '-'} ${N(b)}`), answer: add ? a + b : a - b, meta: { a, b, op: add ? '+' : '-' } };
};

// ---------- parity ----------
R['g3-even-odd'] = (rng, { params }) => {
  const n = retry(() => rng.int(10, params.max));
  return {
    items: [`Is ${n} even or odd?`],
    answer: n % 2 === 0 ? 'even' : 'odd',
    answerType: 'choice',
    choices: ['even', 'odd'],
    meta: { n },
  };
};
