// For every skill and level: generate 200 problems from a fixed seed and verify them independently.
import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import { getSkills, generateProblem, checkAnswer, createRng } from '../../lib/curriculum/math/index.js';
import { CONSTRAINTS, assertAnswer, keypadCanType, plainFromParts, lhs } from './helpers.js';

const N = 200;
const ALLOWED_TYPES = new Set(['integer', 'decimal', 'fraction', 'symbol', 'choice', 'quotient_remainder']);
const KEYPAD_KEYS = ['digits', 'minus', 'decimal', 'fractionSlash', 'mixedSpace', 'remainder', 'compare', 'yesNo', 'choices', 'maxDigits'];

/** Off-by-one wrong answers for any answer type. */
function wrongAnswers(p) {
  const a = p.answer;
  const bump = (str, d) => {
    const neg = str.startsWith('-');
    const dec = (str.split('.')[1] || '').length;
    const scaled = Number(str.replace('-', '').replace('.', '')) * (neg ? -1 : 1) + d;
    const abs = String(Math.abs(scaled)).padStart(dec + 1, '0');
    const out = dec ? `${abs.slice(0, -dec)}.${abs.slice(-dec)}` : abs;
    return (scaled < 0 ? '-' : '') + out;
  };
  switch (p.answerType) {
    case 'symbol':
      return ['<', '>', '='].filter((x) => x !== a);
    case 'choice':
      return p.keypad.choices.filter((x) => x !== a);
    case 'fraction': {
      if (a.includes('/')) {
        const [n, d] = a.split('/').map(Number);
        return [`${n + 1}/${d}`, `${n}/${d + 1}`];
      }
      return [bump(a, 1), bump(a, -1)];
    }
    case 'quotient_remainder': {
      const m = /^(\d+)(?: R (\d+))?$/.exec(a);
      const q = +m[1];
      const r = +(m[2] || 0);
      const out = [`${q + 1} R ${r}`, `${q} R ${r + 1}`];
      if (q > 0) out.push(`${q - 1} R ${r}`);
      if (r > 0) out.push(String(q));
      return out;
    }
    default:
      return [bump(a, 1), bump(a, -1)];
  }
}

/** Equivalent spellings a kid might type. */
function acceptedVariants(p) {
  const a = p.answer;
  const out = [a, ` ${a} `];
  if (['integer', 'decimal'].includes(p.answerType)) {
    if (a.startsWith('-')) out.push(a.replace('-', '−'));
    if (p.answerType === 'decimal') {
      out.push(a.includes('.') ? `${a}0` : `${a}.0`);
      if (a.startsWith('0.')) out.push(a.slice(1));
    }
  }
  if (p.answerType === 'quotient_remainder' && a.includes(' R ')) {
    const [q, r] = a.split(' R ');
    out.push(`${q}R${r}`, `${q}r${r}`, `${q} r ${r}`, `${q} r${r}`);
  }
  if (p.answerType === 'symbol' || p.answerType === 'choice') out.push(a.toUpperCase());
  return out;
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

for (const skill of getSkills()) {
  describe(`${skill.id}`, () => {
    skill.levels.forEach((level, i) => {
      it(`L${i + 1} ${level.name}`, () => {
        const rng = createRng(`${skill.id}#${i}`);
        const seen = [];
        let prev = null;
        let trivialMult = 0;
        let eqCount = 0;
        let yes = 0;
        let hundred = 0;
        for (let k = 0; k < N; k++) {
          const p = generateProblem(skill.id, i, rng);
          const ctx = { p, i, params: level.params, prompt: p.prompt };
          seen.push(p.prompt);
          // ---- shape
          assert.equal(p.skillId, skill.id);
          assert.equal(p.levelIndex, i);
          assert.ok(ALLOWED_TYPES.has(p.answerType), p.answerType);
          assert.equal(typeof p.prompt, 'string');
          assert.equal(typeof p.answer, 'string');
          assert.ok(p.prompt.length > 0 && p.promptParts.length > 0);
          assert.equal(plainFromParts(p.promptParts), p.prompt, 'promptParts must match prompt');
          assert.deepEqual(Object.keys(p.keypad).sort(), [...KEYPAD_KEYS].sort());
          // ---- no back-to-back repeat
          assert.notEqual(p.prompt, prev, `repeat: ${p.prompt}`);
          prev = p.prompt;
          // ---- independent answer + constraints + keypad
          assertAnswer(p);
          const c = CONSTRAINTS[skill.id];
          assert.ok(c, `missing constraints for ${skill.id}`);
          try {
            c(ctx);
          } catch (e) {
            e.message = `${skill.id}.L${i + 1} "${p.prompt}": ${e.message}`;
            throw e;
          }
          assert.ok(keypadCanType(p), `keypad cannot type ${p.answer} for ${p.prompt}: ${JSON.stringify(p.keypad)}`);
          // ---- checkAnswer
          for (const v of acceptedVariants(p)) {
            const r = checkAnswer(p, v);
            assert.ok(r.correct, `should accept "${v}" for ${p.prompt} (answer ${p.answer})`);
          }
          for (const w of wrongAnswers(p)) {
            const r = checkAnswer(p, w);
            assert.ok(!r.correct, `should reject "${w}" for ${p.prompt} (answer ${p.answer})`);
          }
          if (p.answerType === 'fraction') {
            const [n, d] = p.answer.includes('/') ? p.answer.split('/').map(Number) : [Number(p.answer), 1];
            // equivalent unreduced form: accepted with the simplify hint unless simplest form is required
            const eq2 = d === 1 ? `${n * 2}/2` : `${n * 2}/${d * 2}`;
            const r = checkAnswer(p, eq2);
            if (p.requireSimplest) assert.ok(!r.correct && r.feedbackHint);
            else assert.ok(r.correct && r.feedbackHint === 'can you simplify?', `${p.prompt} ${eq2}`);
            if (n > d && d > 1) {
              const mixed = `${Math.floor(n / d)} ${n % d}/${d}`;
              const mr = checkAnswer(p, n % d ? mixed : `${n / d}`);
              assert.ok(mr.correct && !mr.feedbackHint, `mixed ${mixed} for ${p.prompt}`);
            }
          }
          // ---- x0 / x1 flood guard for plain fact prompts
          const m = /^(\d+) x (\d+) = __$/.exec(p.prompt);
          if (m && (+m[1] <= 1 || +m[2] <= 1)) trivialMult++;
          if (p.answerType === 'symbol' && p.answer === '=') eqCount++;
          if (['yes', 'prime', 'even'].includes(p.answer)) yes++;
          if (/\b(99|100|101)\b/.test(p.prompt) || p.answer === '100') hundred++;
        }
        // ---- level-level statistics
        const distinct = new Set(seen).size;
        assert.ok(distinct >= 2, 'level yields varied problems');
        const isZeroOneLevel = skill.id === 'g3-mult-0-1-2-5-10' && i === 3;
        if (!isZeroOneLevel) assert.ok(trivialMult <= N * 0.25, `${skill.id}.L${i + 1}: ${trivialMult}/${N} are x0/x1 problems`);
        if (skill.id === 'g1-compare' && i > 0) assert.ok(eqCount >= N * 0.05 && eqCount <= N * 0.3, `equal share ${eqCount}`);
        const share = yes / N;
        if (skill.id === 'g3-even-odd') assert.ok(share > 0.35 && share < 0.65, `even share ${share}`);
        if (skill.id === 'g4-factors-multiples' && i < 2) assert.ok(share > 0.35 && share < 0.65, `yes share ${share}`);
        if (skill.id === 'g5-prime-composite') assert.ok(share > 0.3 && share < 0.5, `prime share ${share}`);
        if (skill.id === 'g1-count-seq' && i === 2) assert.ok(hundred >= N * 0.1, `crossing 100: ${hundred}`);
        if (skill.id === 'g2-compare-1000' && i === 2) assert.ok(eqCount >= 5, 'some equal pairs');
      });
    });
  });
}

describe('generateProblem general behavior', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const run = (seed) => {
      const rng = createRng(seed);
      return Array.from({ length: 30 }, () => generateProblem('g4-mult-2x2', 2, rng).prompt);
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });
  it('rejects unknown skills and levels', () => {
    expect(() => generateProblem('nope', 0)).toThrow(RangeError);
    expect(() => generateProblem('g3-mult-3-4', 3)).toThrow(RangeError);
    expect(() => generateProblem('g3-mult-3-4', -1)).toThrow(RangeError);
  });
  it('works without an rng argument and never repeats back-to-back', () => {
    let prev = null;
    for (let k = 0; k < 100; k++) {
      const p = generateProblem('g1-add-10', 1);
      expect(p.prompt).not.toBe(prev);
      prev = p.prompt;
    }
  });
  it('covers all 79 skills and 254 levels', () => {
    const skills = getSkills();
    expect(skills).toHaveLength(79);
    expect(skills.reduce((s, x) => s + x.levels.length, 0)).toBe(254);
    expect(getSkills(3).every((s) => s.grade === 3)).toBe(true);
    expect(getSkills(1)).toHaveLength(12);
  });
  it('sets keypad flags for each answer family', () => {
    const rng = createRng(5);
    const kp = (id, i) => generateProblem(id, i, rng).keypad;
    expect(kp('g6-integer-add-sub', 0).minus).toBe(true);
    expect(kp('g4-decimal-add-sub', 0).decimal).toBe(true);
    expect(kp('g4-fraction-add-sub', 0).fractionSlash).toBe(true);
    expect(kp('g4-div-1digit', 2).remainder).toBe(true);
    expect(kp('g4-div-1digit', 0).remainder).toBe(false);
    expect(kp('g1-compare', 0)).toMatchObject({ compare: true, digits: false, choices: ['<', '>', '='] });
    expect(kp('g4-factors-multiples', 0)).toMatchObject({ yesNo: true, choices: ['yes', 'no'], digits: false });
    expect(kp('g4-factors-multiples', 2)).toMatchObject({ yesNo: false, digits: true });
    expect(kp('g5-prime-composite', 0).choices).toEqual(['prime', 'composite']);
    expect(kp('g3-mult-3-4', 0)).toMatchObject({ minus: false, decimal: false, fractionSlash: false, remainder: false, compare: false });
  });
  it('renders fractions, powers, coins and blanks as typed promptParts', () => {
    const rng = createRng(9);
    const frac = generateProblem('g4-fraction-add-sub', 0, rng);
    expect(frac.promptParts.filter((x) => x.t === 'fraction')).toHaveLength(2);
    expect(frac.promptParts.at(-1)).toEqual({ t: 'blank' });
    expect(generateProblem('g6-exponents', 0, rng).promptParts.some((x) => x.t === 'power')).toBe(true);
    expect(generateProblem('g1-coins', 0, rng).promptParts.some((x) => x.t === 'coin')).toBe(true);
    const times = generateProblem('g3-mult-3-4', 0, rng);
    expect(times.prompt).toMatch(/ x /);
    expect(times.promptParts[0].v).toMatch(/×/);
    const eqFrac = generateProblem('g3-fraction-equiv', 0, rng);
    expect(eqFrac.promptParts.some((x) => x.t === 'fraction' && x.num === null)).toBe(true);
  });
});

void lhs;
void gcd;
