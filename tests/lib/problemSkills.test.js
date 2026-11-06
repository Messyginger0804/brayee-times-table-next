import { describe, it, expect } from 'vitest';
import { PROBLEM_SKILLS, isProblemSkill, parseProblemText } from '../../lib/problemSkills';

describe('parseProblemText', () => {
  it.each([['3 x 4', [3, 4]], ['12x5', [12, 5]], ['  7 X 8 ', [7, 8]], ['6 × 9', [6, 9]]])('%j', (t, out) => expect(parseProblemText(t)).toEqual(out));
  it.each([[''], [null], [undefined], ['3 + 4'], ['x 4'], ['3 x'], ['3 x 4 x 5'], ['-3 x 4']])('%j -> null', (t) => expect(parseProblemText(t)).toBeNull());
});

describe('isProblemSkill', () => {
  it('knows its own ids and ignores inherited/unknown ones', () => {
    for (const id of Object.keys(PROBLEM_SKILLS)) expect(isProblemSkill(id)).toBe(true);
    expect(isProblemSkill('toString')).toBe(false);
    expect(isProblemSkill('nope')).toBe(false);
  });
});

describe('PROBLEM_SKILLS matchers', () => {
  const m = PROBLEM_SKILLS;
  it('0/1/2/5/10 facts', () => {
    expect(m['g3-mult-0-1-2-5-10'](2, 9)).toBe(true);
    expect(m['g3-mult-0-1-2-5-10'](9, 10)).toBe(true);
    expect(m['g3-mult-0-1-2-5-10'](3, 4)).toBe(false);
    expect(m['g3-mult-0-1-2-5-10'](11, 2)).toBe(false); // above 10
  });
  it('3 and 4 facts', () => {
    expect(m['g3-mult-3-4'](3, 7)).toBe(true);
    expect(m['g3-mult-3-4'](8, 4)).toBe(true);
    expect(m['g3-mult-3-4'](5, 6)).toBe(false);
    expect(m['g3-mult-3-4'](3, 11)).toBe(false);
  });
  it('9s and squares from 6', () => {
    const f = m['g3-mult-9-squares'];
    expect(f(9, 2)).toBe(true);
    expect(f(2, 9)).toBe(true);
    expect(f(6, 6)).toBe(true);
    expect(f(10, 10)).toBe(true);
    expect(f(5, 5)).toBe(false); // squares only from 6
    expect(f(6, 7)).toBe(false);
  });
  it('6-7-8 block', () => {
    const f = m['g3-mult-6-7-8'];
    expect(f(6, 8)).toBe(true);
    expect(f(5, 7)).toBe(false);
    expect(f(7, 9)).toBe(false);
  });
  it('mixed covers the whole 10x10 table', () => {
    expect(m['g3-mult-mixed'](10, 10)).toBe(true);
    expect(m['g3-mult-mixed'](11, 1)).toBe(false);
  });
  it('11-15 extension is capped at 12 and needs a factor >= 11', () => {
    const f = m['g4-mult-11-15'];
    expect(f(11, 3)).toBe(true);
    expect(f(12, 12)).toBe(true);
    expect(f(10, 10)).toBe(false);
    expect(f(13, 2)).toBe(false);
  });
});
