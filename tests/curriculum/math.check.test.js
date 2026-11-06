import { describe, it, expect } from 'vitest';
import { checkAnswer } from '../../lib/curriculum/math/index.js';

const P = (answerType, answer, extra = {}) => ({ answerType, answer, keypad: { choices: null }, meta: {}, ...extra });

describe('integers and decimals', () => {
  it('trims spaces and tolerates leading zeros and thousands commas', () => {
    expect(checkAnswer(P('integer', '48'), '  48 ').correct).toBe(true);
    expect(checkAnswer(P('integer', '48'), '048').correct).toBe(true);
    expect(checkAnswer(P('integer', '1000'), '1,000').correct).toBe(true);
    expect(checkAnswer(P('integer', '48'), '48 ').normalized).toBe('48');
  });
  it('treats 0.5, .5 and 0.50 as equal', () => {
    const p = P('decimal', '0.5');
    for (const v of ['0.5', '.5', '0.50', ' .50 ', '00.5']) {
      const r = checkAnswer(p, v);
      expect(r.correct, v).toBe(true);
      expect(r.normalized).toBe('0.5');
    }
    expect(checkAnswer(p, '0.05').correct).toBe(false);
    expect(checkAnswer(p, '0.05').feedbackHint).toMatch(/decimal point/);
    expect(checkAnswer(p, '5').correct).toBe(false);
  });
  it('accepts whole-number forms of decimal answers (3 = 3.0)', () => {
    expect(checkAnswer(P('decimal', '3'), '3.0').correct).toBe(true);
    expect(checkAnswer(P('decimal', '3'), '3.').correct).toBe(true);
  });
  it('accepts money symbols', () => {
    expect(checkAnswer(P('decimal', '0.95'), '$0.95').correct).toBe(true);
    expect(checkAnswer(P('decimal', '5.3'), '$5.30').correct).toBe(true);
    expect(checkAnswer(P('integer', '35'), '35¢').correct).toBe(true);
    expect(checkAnswer(P('decimal', '75'), '75%').correct).toBe(true);
  });
  it('rejects empty and non-numeric input with a hint', () => {
    for (const v of ['', '   ', 'abc', '.', '-', '1.2.3', null, undefined]) {
      const r = checkAnswer(P('integer', '5'), v);
      expect(r.correct, String(v)).toBe(false);
      expect(r.normalized).toBe(null);
      expect(r.feedbackHint).toBeTruthy();
    }
    expect(checkAnswer(P('integer', '5'), '1/2').feedbackHint).toMatch(/fraction/);
  });
  it('accepts numbers typed as numbers', () => {
    expect(checkAnswer(P('integer', '12'), 12).correct).toBe(true);
    expect(checkAnswer(P('decimal', '0.5'), 0.5).correct).toBe(true);
  });
});

describe('negatives', () => {
  it('accepts hyphen-minus and the real minus sign', () => {
    const p = P('integer', '-5');
    for (const v of ['-5', '−5', '– 5', '- 5', ' − 5 ']) expect(checkAnswer(p, v).correct, v).toBe(true);
    expect(checkAnswer(p, '-5').normalized).toBe('-5');
  });
  it('rejects the wrong sign with a hint', () => {
    const r = checkAnswer(P('integer', '-5'), '5');
    expect(r.correct).toBe(false);
    expect(r.feedbackHint).toMatch(/sign/);
    expect(checkAnswer(P('integer', '5'), '−5').feedbackHint).toMatch(/sign/);
  });
  it('does not treat -0 as different from 0', () => {
    expect(checkAnswer(P('integer', '0'), '-0').correct).toBe(true);
  });
  it('handles negative decimals', () => {
    expect(checkAnswer(P('decimal', '-0.5'), '−.50').correct).toBe(true);
  });
});

describe('remainders', () => {
  const p = P('quotient_remainder', '7 R 2', { meta: { divisor: 5 } });
  it('accepts 7 R2, 7r2, 7 r 2 and friends', () => {
    for (const v of ['7 R 2', '7 R2', '7R2', '7r2', '7 r 2', '7 r2', '7 R. 2', ' 7  r  2 ', '7 rem 2', '7 remainder 2']) {
      const r = checkAnswer(p, v);
      expect(r.correct, v).toBe(true);
      expect(r.normalized).toBe('7 R 2');
    }
  });
  it('accepts the two-field object form', () => {
    expect(checkAnswer(p, { quotient: '7', remainder: '2' }).correct).toBe(true);
    expect(checkAnswer(p, { quotient: 7, remainder: 3 }).correct).toBe(false);
  });
  it('gives targeted hints', () => {
    expect(checkAnswer(p, '7').feedbackHint).toMatch(/remainder/i);
    expect(checkAnswer(p, '7 R 1').feedbackHint).toMatch(/Check your remainder/);
    expect(checkAnswer(p, '6 R 2').feedbackHint).toBeUndefined();
    expect(checkAnswer(p, '6 R 7').feedbackHint).toMatch(/too big/);
    expect(checkAnswer(p, '7 R').correct).toBe(false);
  });
  it('whole quotients: R 0 is optional', () => {
    const w = P('quotient_remainder', '21');
    expect(checkAnswer(w, '21').correct).toBe(true);
    expect(checkAnswer(w, '21 R 0').correct).toBe(true);
    expect(checkAnswer(w, '21 R 1').correct).toBe(false);
  });
});

describe('comparison and choices', () => {
  it('accepts < > = and common spellings', () => {
    expect(checkAnswer(P('symbol', '<'), '<').correct).toBe(true);
    expect(checkAnswer(P('symbol', '>'), ' > ').correct).toBe(true);
    expect(checkAnswer(P('symbol', '='), '==').correct).toBe(true);
    expect(checkAnswer(P('symbol', '<'), 'less').correct).toBe(true);
    expect(checkAnswer(P('symbol', '<'), '>').correct).toBe(false);
    const bad = checkAnswer(P('symbol', '<'), 'x');
    expect(bad.correct).toBe(false);
    expect(bad.normalized).toBe(null);
  });
  it('accepts yes/no, even/odd, prime/composite, case-insensitive and by first letter', () => {
    const yn = P('choice', 'yes', { keypad: { choices: ['yes', 'no'] } });
    for (const v of ['yes', 'YES', 'y', ' Yes ']) expect(checkAnswer(yn, v).correct, v).toBe(true);
    expect(checkAnswer(yn, 'no').correct).toBe(false);
    expect(checkAnswer(yn, 'n').normalized).toBe('no');
    const eo = P('choice', 'odd', { keypad: { choices: ['even', 'odd'] } });
    expect(checkAnswer(eo, 'o').correct).toBe(true);
    expect(checkAnswer(eo, 'E').correct).toBe(false);
    const pc = P('choice', 'composite', { keypad: { choices: ['prime', 'composite'] } });
    expect(checkAnswer(pc, 'c').correct).toBe(true);
    expect(checkAnswer(pc, 'p').correct).toBe(false);
    expect(checkAnswer(pc, 'maybe').feedbackHint).toBeTruthy();
  });
});

describe('fractions', () => {
  const half = P('fraction', '3/4');
  it('accepts exact and equivalent fractions, hinting to simplify', () => {
    expect(checkAnswer(half, '3/4')).toEqual({ correct: true, normalized: '3/4' });
    expect(checkAnswer(half, ' 3 / 4 ').correct).toBe(true);
    const r = checkAnswer(half, '6/8');
    expect(r.correct).toBe(true);
    expect(r.feedbackHint).toBe('can you simplify?');
    expect(r.normalized).toBe('6/8');
    expect(checkAnswer(half, '3/5').correct).toBe(false);
    expect(checkAnswer(half, '4/3').correct).toBe(false);
  });
  it('requires simplest form only when the problem says so', () => {
    const strict = P('fraction', '3/4', { requireSimplest: true });
    const r = checkAnswer(strict, '6/8');
    expect(r.correct).toBe(false);
    expect(r.feedbackHint).toMatch(/simplest/);
    expect(checkAnswer(strict, '3/4').correct).toBe(true);
  });
  it('handles improper fractions, mixed numbers and whole numbers', () => {
    const imp = P('fraction', '3/2');
    expect(checkAnswer(imp, '3/2').correct).toBe(true);
    expect(checkAnswer(imp, '1 1/2')).toEqual({ correct: true, normalized: '1 1/2' });
    expect(checkAnswer(imp, '6/4').feedbackHint).toBe('can you simplify?');
    expect(checkAnswer(imp, '1 2/4').feedbackHint).toBe('can you simplify?');
    expect(checkAnswer(imp, '1 1/3').correct).toBe(false);
    const whole = P('fraction', '4');
    expect(checkAnswer(whole, '4').correct).toBe(true);
    expect(checkAnswer(whole, '8/2').feedbackHint).toBe('can you simplify?');
    expect(checkAnswer(whole, '3 4/4').correct).toBe(true);
    expect(checkAnswer(whole, '5').correct).toBe(false);
  });
  it('strict simplest form accepts a simplified mixed number', () => {
    const strict = P('fraction', '17/12', { requireSimplest: true });
    expect(checkAnswer(strict, '17/12').correct).toBe(true);
    expect(checkAnswer(strict, '1 5/12').correct).toBe(true);
    expect(checkAnswer(strict, '1 10/24').correct).toBe(false);
    expect(checkAnswer(P('fraction', '3/2', { requireSimplest: true }), '1 3/6').correct).toBe(false);
  });
  it('rejects malformed fractions', () => {
    for (const v of ['3/', '/4', '3//4', '3/0', 'a/b', '', '0.75']) {
      const r = checkAnswer(half, v);
      expect(r.correct, v).toBe(false);
      expect(r.feedbackHint).toBeTruthy();
    }
  });
  it('accepts the real minus sign for negative fractions', () => {
    expect(checkAnswer(P('fraction', '-1/2'), '−1/2').correct).toBe(true);
  });
});

describe('integer answers never accept fraction or remainder junk', () => {
  it('rejects off-by-one', () => {
    expect(checkAnswer(P('integer', '42'), '41').correct).toBe(false);
    expect(checkAnswer(P('integer', '42'), '43').correct).toBe(false);
    expect(checkAnswer(P('decimal', '0.18'), '0.17').correct).toBe(false);
    expect(checkAnswer(P('decimal', '0.18'), '0.19').correct).toBe(false);
  });
});
