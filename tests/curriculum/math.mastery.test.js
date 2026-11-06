import { describe, it, expect } from 'vitest';
import { getSkill, masteryStatus } from '../../lib/curriculum/math/index.js';

const mk = (n, { wrong = 0, slow = 0, seconds = 2 } = {}) =>
  Array.from({ length: n }, (_, i) => ({ correct: i >= wrong, seconds: i >= wrong && i < wrong + slow ? seconds + 100 : seconds }));

describe('masteryStatus', () => {
  const fact = getSkill('g3-mult-3-4'); // 95% / 3 s / window 20
  const comp = getSkill('g3-add-1000'); // 90% / 12 s / window 20

  it('uses the skill mastery block (fact 95%, computation 90%)', () => {
    expect(fact.mastery).toMatchObject({ accuracyPct: 95, secondsPerProblem: 3, window: 20 });
    expect(comp.mastery).toMatchObject({ accuracyPct: 90, secondsPerProblem: 12, window: 20 });
  });
  it('masters with 20/20 fast and correct', () => {
    const r = masteryStatus(mk(20), fact);
    expect(r.mastered).toBe(true);
    expect(r.reason).toBe(null);
  });
  it('facts need 95%: 19/20 passes, 18/20 fails', () => {
    expect(masteryStatus(mk(20, { wrong: 1 }), fact).mastered).toBe(true);
    const r = masteryStatus(mk(20, { wrong: 2 }), fact);
    expect(r.mastered).toBe(false);
    expect(r.accuracyPct).toBe(90);
    expect(r.reason).toMatch(/Accuracy 90% is below 95%/);
  });
  it('computation needs 90%: 18/20 passes, 17/20 fails', () => {
    expect(masteryStatus(mk(20, { wrong: 2, seconds: 5 }), comp).mastered).toBe(true);
    expect(masteryStatus(mk(20, { wrong: 3, seconds: 5 }), comp).mastered).toBe(false);
  });
  it('a correct answer only counts when it is within the time target', () => {
    const r = masteryStatus(mk(20, { slow: 2 }), fact);
    expect(r.mastered).toBe(false);
    expect(r.accuracyPct).toBe(100);
    expect(r.qualifyingPct).toBe(90);
    expect(r.reason).toMatch(/Too slow/);
    expect(masteryStatus(mk(20, { slow: 2 }), fact, { requireTime: false }).mastered).toBe(true);
    // exactly at the limit is fine
    expect(masteryStatus(mk(20, { seconds: 3 }), fact).mastered).toBe(true);
    expect(masteryStatus(mk(20, { seconds: 3.01 }), fact).mastered).toBe(false);
  });
  it('only looks at the last 20 results', () => {
    const history = [...mk(30, { wrong: 30 }), ...mk(20)];
    expect(masteryStatus(history, fact).mastered).toBe(true);
    const recentBad = [...mk(20), ...mk(5, { wrong: 5 })];
    expect(masteryStatus(recentBad, fact).mastered).toBe(false);
  });
  it('needs a full window of attempts', () => {
    const r = masteryStatus(mk(19), fact);
    expect(r.mastered).toBe(false);
    expect(r.attempts).toBe(19);
    expect(r.reason).toMatch(/1 more problem\./);
    expect(masteryStatus([], fact)).toMatchObject({ mastered: false, attempts: 0 });
    expect(masteryStatus(undefined, fact).mastered).toBe(false);
  });
  it('treats missing times as not within the target, and accepts ms', () => {
    const untimed = Array.from({ length: 20 }, () => ({ correct: true }));
    expect(masteryStatus(untimed, fact).mastered).toBe(false);
    expect(masteryStatus(untimed, fact, { requireTime: false }).mastered).toBe(true);
    const ms = Array.from({ length: 20 }, () => ({ correct: true, ms: 2500 }));
    expect(masteryStatus(ms, fact).mastered).toBe(true);
  });
  it('requires every level when results carry levelIndex', () => {
    const levels = fact.levels.length; // 3
    const all = [];
    for (let l = 0; l < levels; l++) mk(20).forEach((r) => all.push({ ...r, levelIndex: l }));
    expect(masteryStatus(all, fact).mastered).toBe(true);
    const missing = all.filter((r) => r.levelIndex !== 2);
    const s = masteryStatus(missing, fact);
    expect(s.mastered).toBe(false);
    expect(s.reason).toMatch(/^Level 3:/);
    expect(s.byLevel).toHaveLength(levels);
    expect(s.byLevel[0].mastered).toBe(true);
  });
  it('accepts a skill object copy as long as mastery is present', () => {
    expect(masteryStatus(mk(20), { mastery: { accuracyPct: 90, secondsPerProblem: 5, window: 10 } }).mastered).toBe(true);
  });
});
