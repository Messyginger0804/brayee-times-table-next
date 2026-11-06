import { describe, it, expect } from 'vitest';
import { getMultiplicationFacts, MULT_SETS, getSkill } from '../../lib/curriculum/math/index.js';

describe('getMultiplicationFacts', () => {
  const facts = getMultiplicationFacts();
  it('returns the 144 Problem-table rows, "a x b" style, with correct answers', () => {
    expect(facts).toHaveLength(144);
    const keys = new Set(facts.map((f) => f.problem));
    expect(keys.size).toBe(144);
    for (const f of facts) {
      expect(f.problem).toBe(`${f.a} x ${f.b}`);
      expect(f.answer).toBe(f.a * f.b);
      expect(f.inTable).toBe(true);
    }
    expect(facts.filter((f) => f.grade === 3)).toHaveLength(100);
    expect(facts.filter((f) => f.grade === 4)).toHaveLength(44);
  });
  it('orders sets x2, x10, x5, x0/1, x4, x3, x9, squares, x6, x7, x8, then grade 4', () => {
    expect(MULT_SETS.map((s) => s.id)).toEqual(['x2', 'x10', 'x5', 'x0x1', 'x4', 'x3', 'x9', 'squares', 'x6', 'x7', 'x8', 'x11', 'x12']);
    const firstSeen = [];
    for (const f of facts) if (!firstSeen.includes(f.setId)) firstSeen.push(f.setId);
    expect(firstSeen).toEqual(['x2', 'x10', 'x5', 'x0x1', 'x4', 'x3', 'x9', 'squares', 'x6', 'x7', 'x8', 'x11', 'x12']);
    facts.forEach((f, i) => expect(f.order).toBe(i));
  });
  it('assigns each fact to the earliest set among its factors', () => {
    const by = (p) => facts.find((f) => f.problem === p);
    expect(by('7 x 2').setId).toBe('x2');
    expect(by('10 x 5').setId).toBe('x10');
    expect(by('1 x 1').setId).toBe('x0x1');
    expect(by('6 x 6').setId).toBe('squares');
    expect(by('3 x 9').setId).toBe('x3');
    expect(by('9 x 9').setId).toBe('x9');
    expect(by('7 x 8').setId).toBe('x7');
    expect(by('7 x 8').hard).toBe(true);
    expect(by('8 x 7').hard).toBe(true);
    expect(by('6 x 8').hard).toBe(true);
    expect(by('6 x 4').hard).toBe(false);
    expect(by('11 x 12').setId).toBe('x11');
    expect(by('12 x 12').setId).toBe('x12');
    expect(by('12 x 3').grade).toBe(4);
  });
  it('puts hard 6/7/8 facts last within their set and maps every set to a real skill level', () => {
    const x7 = facts.filter((f) => f.setId === 'x7').map((f) => f.hard);
    expect(x7.lastIndexOf(false)).toBeLessThan(x7.indexOf(true));
    for (const s of MULT_SETS) expect(getSkill(s.skillId).levels[s.levelIndex], s.id).toBeTruthy();
  });
  it('can include the x0 facts, flagged as not in the table', () => {
    const withZero = getMultiplicationFacts({ includeZero: true });
    const zeros = withZero.filter((f) => !f.inTable);
    expect(zeros).toHaveLength(21);
    expect(zeros.every((f) => f.a === 0 || f.b === 0)).toBe(true);
    expect(withZero.filter((f) => f.inTable)).toHaveLength(144);
  });
});
