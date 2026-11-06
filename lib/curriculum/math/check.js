// Kid-forgiving answer checking. Pure functions, no dependencies on generators.
import { gcd } from './util.js';

const MINUS_RE = /[−‒–—➖]/g;

function clean(input) {
  return String(input ?? '')
    .replace(MINUS_RE, '-')
    .replace(/ /g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** "0.50" / ".5" / "-.5" / "$1,000.0" -> canonical decimal string, or null. */
function normalizeNumber(raw) {
  let s = clean(raw);
  s = s.replace(/^\$\s*/, '').replace(/\s*(%|¢|cents?)$/i, '').replace(/,/g, '');
  s = s.replace(/^([+-])\s+/, '$1');
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (!m[2] && !m[3])) return null;
  const neg = m[1] === '-';
  const ip = (m[2] || '').replace(/^0+(?=\d)/, '') || '0';
  const fp = (m[3] || '').replace(/0+$/, '');
  const body = fp ? `${ip}.${fp}` : ip;
  return neg && body !== '0' ? `-${body}` : body;
}

/** "3/4", "1 1/2", "-2/3", "4" -> { n, d, whole, form } or null. n/d is the improper value. */
function parseFraction(raw) {
  const s = clean(raw).replace(/\s*\/\s*/g, '/');
  let m = /^(-)?(\d+)$/.exec(s);
  if (m) return { n: (m[1] ? -1 : 1) * Number(m[2]), d: 1, form: 'int', num: Number(m[2]), den: 1, text: s };
  m = /^(-)?(?:(\d+) )?(\d+)\/(\d+)$/.exec(s);
  if (!m) return null;
  const den = Number(m[4]);
  if (den === 0) return null;
  const whole = m[2] === undefined ? 0 : Number(m[2]);
  const num = Number(m[3]);
  const sgn = m[1] ? -1 : 1;
  return {
    n: sgn * (whole * den + num),
    d: den,
    form: m[2] === undefined ? 'frac' : 'mixed',
    num,
    den,
    text: s,
  };
}

/** "7 R2", "7r2", "7 r 2", "7 rem 2", "7" -> { q, r, explicit } or null. */
function parseQuotientRemainder(raw) {
  if (raw && typeof raw === 'object') {
    const q = String(raw.quotient ?? '').trim();
    const r = String(raw.remainder ?? '').trim();
    if (!/^\d+$/.test(q) || (r && !/^\d+$/.test(r))) return null;
    return { q: Number(q), r: r ? Number(r) : 0, explicit: r !== '' };
  }
  const s = clean(raw).replace(/,/g, '');
  let m = /^(\d+)$/.exec(s);
  if (m) return { q: Number(m[1]), r: 0, explicit: false };
  m = /^(\d+) ?(?:r|rem|remainder)\.? ?(\d+)$/i.exec(s);
  if (m) return { q: Number(m[1]), r: Number(m[2]), explicit: true };
  return null;
}

const SYMBOLS = {
  '<': '<', '＜': '<', lt: '<', less: '<', 'less than': '<',
  '>': '>', '＞': '>', gt: '>', greater: '>', 'greater than': '>',
  '=': '=', '==': '=', '＝': '=', equal: '=', equals: '=', 'equal to': '=',
};
function normalizeSymbol(raw) {
  return SYMBOLS[clean(raw).toLowerCase()] ?? null;
}

const CHOICE_SYNONYMS = { y: 'yes', yes: 'yes', yeah: 'yes', n: 'no', no: 'no', nope: 'no' };
function normalizeChoice(raw, choices) {
  const s = clean(raw).toLowerCase();
  if (!s) return null;
  if (choices.includes(s)) return s;
  if (choices.includes('yes') && CHOICE_SYNONYMS[s]) return CHOICE_SYNONYMS[s];
  const hits = choices.filter((c) => c.startsWith(s));
  return hits.length === 1 ? hits[0] : null;
}

const fail = (normalized, feedbackHint) => ({ correct: false, normalized, ...(feedbackHint ? { feedbackHint } : {}) });

function checkNumber(problem, input) {
  const norm = normalizeNumber(input);
  if (norm === null) {
    const hint = /[/]/.test(clean(input)) ? 'Type a number, not a fraction.' : clean(input) ? 'Type just a number.' : 'Type your answer.';
    return fail(null, hint);
  }
  const want = normalizeNumber(problem.answer);
  if (norm === want) return { correct: true, normalized: norm };
  if (want.startsWith('-') !== norm.startsWith('-') && want.replace('-', '') === norm.replace('-', ''))
    return fail(norm, 'Check the sign (plus or minus).');
  const dig = (x) => x.replace(/[-.]/g, '').replace(/^0+/, '');
  if (dig(norm) === dig(want)) return fail(norm, 'Check where the decimal point goes.');
  return fail(norm);
}

function isSimplest(f) {
  if (f.form === 'int') return true;
  if (gcd(f.num, f.den) !== 1) return false;
  return f.form === 'mixed' ? f.num < f.den : true;
}

function checkFraction(problem, input) {
  const f = parseFraction(input);
  if (!f) return fail(null, clean(input) ? 'Write it like 3/4, or 1 1/2 for a mixed number.' : 'Type your answer.');
  const want = parseFraction(problem.answer);
  const normalized = f.text;
  if (f.n * want.d !== want.n * f.d) return fail(normalized);
  if (!isSimplest(f)) {
    if (problem.requireSimplest) return fail(normalized, 'Right value! Write it in simplest form.');
    return { correct: true, normalized, feedbackHint: 'can you simplify?' };
  }
  return { correct: true, normalized };
}

function quotientRemainderHint(got, want, divisor) {
  if (divisor && got.r >= divisor) return 'Your remainder is too big. Keep dividing!';
  if (got.q !== want.q) return undefined;
  if (want.r > 0 && !got.explicit) return "Don't forget the remainder (R).";
  return 'Check your remainder.';
}

function checkQuotientRemainder(problem, input) {
  const got = parseQuotientRemainder(input);
  if (!got) return fail(null, clean(typeof input === 'string' ? input : '') ? 'Write it like 7 R 2.' : 'Type your answer.');
  const want = parseQuotientRemainder(problem.answer);
  const normalized = got.r > 0 ? `${got.q} R ${got.r}` : `${got.q}`;
  if (got.q === want.q && got.r === want.r) return { correct: true, normalized };
  return fail(normalized, quotientRemainderHint(got, want, problem.meta?.divisor));
}

/**
 * Check a typed answer.
 * @param {{answer:string, answerType:string, requireSimplest?:boolean, choices?:string[], keypad?:{choices?:string[]|null}, meta?:object}} problem
 * @param {string|number|{quotient:string|number, remainder:string|number}} input
 * @returns {{correct:boolean, normalized:string|null, feedbackHint?:string}}
 */
export function checkAnswer(problem, input) {
  switch (problem.answerType) {
    case 'symbol': {
      const s = normalizeSymbol(input);
      return s === null ? fail(null, 'Tap <, > or =.') : s === problem.answer ? { correct: true, normalized: s } : fail(s);
    }
    case 'choice': {
      const choices = problem.keypad?.choices || problem.choices || [];
      const c = normalizeChoice(input, choices);
      return c === null ? fail(null, `Pick one: ${choices.join(' or ')}.`) : c === problem.answer ? { correct: true, normalized: c } : fail(c);
    }
    case 'fraction':
      return checkFraction(problem, input);
    case 'quotient_remainder':
      return checkQuotientRemainder(problem, input);
    default:
      return checkNumber(problem, input);
  }
}
