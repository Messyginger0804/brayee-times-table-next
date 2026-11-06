import { describe, it, expect } from 'vitest';
import { SKILLS, getSkill, evaluateWindow, LEVEL_ADVANCE_WINDOW, PROBLEM_SKILLS } from '../../lib/mathSkills.js';
import { getSkills } from '../../lib/curriculum/math/index.js';

const ok = (n, ms = 1000) => Array.from({ length: n }, () => ({ c: true, ms }));

describe('mathSkills (app glue over lib/curriculum)', () => {
  it('has exactly the library skills (one source of truth)', () => {
    expect(SKILLS.map((s) => s.id)).toEqual(getSkills().map((s) => s.id));
    expect(getSkill('g2-add-20').levelCount).toBe(4);
  });
  it('every problem-backed skill exists in the library', () => {
    for (const id of Object.keys(PROBLEM_SKILLS)) expect(getSkill(id)).not.toBeNull();
  });
  it('advances a level after 10 good problems (not 20)', () => {
    const s = getSkill('g2-add-20');
    expect(LEVEL_ADVANCE_WINDOW).toBe(10);
    expect(evaluateWindow(ok(10), s, false).mastered).toBe(true);
    expect(evaluateWindow(ok(9), s, false).mastered).toBe(false);
  });
  it('applies the time rule via ms', () => {
    const s = getSkill('g2-add-20'); // 3s per problem
    expect(evaluateWindow(ok(10, 9000), s, false).mastered).toBe(false);
  });
  it('accuracy rule: facts need 95% (10 of 10), other skills 90% (9 of 10)', () => {
    const facts = getSkill('g2-add-20');
    const other = getSkill('g2-place-value');
    const nine = [...ok(9, 500), { c: false, ms: 500 }];
    expect(evaluateWindow(nine, facts, false).mastered).toBe(false);
    expect(evaluateWindow(nine, other, false).mastered).toBe(true);
  });
  it('skill mastery on the last level keeps the 20-problem window', () => {
    const s = getSkill('g2-add-20');
    expect(evaluateWindow(ok(10), s, true).mastered).toBe(false);
    expect(evaluateWindow(ok(20), s, true).mastered).toBe(true);
  });
});
