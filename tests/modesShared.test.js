import { describe, it, expect } from 'vitest';
import { shuffleArray, selectProblems, idsToMap, normalizeCurriculum, testingStats, missionAction, testingCopy, makePickMission } from '../components/modes/shared/homeLogic';
import { kidHint, pauseMs, buildAttemptPayload, resolveProgress, celebrationFor, skillTitle, progressPct, isPlayable } from '../components/modes/shared/skillLogic';
import { gradeLabel, buildWordParams, normalizeWordsResponse, hiddenSentence, isCorrectSpelling, spellingPauseMs, pickRandom } from '../components/modes/shared/spellingLogic';

describe('home logic', () => {
  it('shuffles without losing items or mutating', () => {
    const a = [1, 2, 3, 4, 5];
    expect(shuffleArray(a).sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5]);
  });
  it('level 1 keeps tables up to 5, others keep all', () => {
    const ps = [{ problem: '2 x 3' }, { problem: '6 x 2' }];
    expect(selectProblems(ps, { level: 1 }, null)).toEqual([ps[0]]);
    expect(selectProblems(ps, { level: 2 }, null)).toEqual(ps);
    expect(selectProblems(ps, { level: 1 }, 'no-such-skill')).toEqual([ps[0]]);
  });
  it('maps ids, normalizes curriculum', () => {
    expect(idsToMap([1, 2])).toEqual({ 1: true, 2: true });
    expect(idsToMap(undefined)).toEqual({});
    expect(normalizeCurriculum({ grade: 3, skills: [1] })).toEqual({ grade: 3, skills: [1] });
    expect(normalizeCurriculum(null)).toEqual({ grade: null, skills: [] });
  });
  it('computes testing stats and copy', () => {
    const s = testingStats([{ id: 1 }, { id: 2 }], { 1: true });
    expect(s).toEqual({ totalCount: 2, completedCount: 1, canUseTesting: false, pct: 50 });
    expect(testingCopy(s)).toBe('Completed 1 / 2 to unlock Testing');
    const all = testingStats([{ id: 1 }], { 1: true });
    expect(all.canUseTesting).toBe(true);
    expect(testingCopy(all)).toBe('All 1 completed. Testing unlocked!');
    expect(testingStats([], {})).toMatchObject({ canUseTesting: false, pct: 0 });
  });
  it('routes mission taps', () => {
    expect(missionAction({ unlocked: false })).toBe('locked');
    expect(missionAction({ unlocked: true, source: 'problems' })).toBe('choose');
    expect(missionAction({ unlocked: true, source: 'generated' })).toBe('route');
    const pushed = []; const picked = [];
    const pick = makePickMission({ push: (u) => pushed.push(u) }, (v) => picked.push(v));
    pick({ id: 'a b', unlocked: true, source: 'generated' });
    pick({ id: 'x', unlocked: false });
    pick({ id: 'y', unlocked: true, source: 'problems' });
    expect(pushed).toEqual(['/skill/a%20b']);
    expect(picked).toEqual([{ id: 'x', unlocked: false, locked: true }, { id: 'y', unlocked: true, source: 'problems' }]);
  });
});

describe('skill logic', () => {
  it('translates hints', () => {
    expect(kidHint('')).toBe('');
    expect(kidHint('Check the sign (plus or minus).')).toBe('Look at the plus or minus sign.');
    expect(kidHint('unknown')).toBe('unknown');
  });
  it('pause lengths', () => {
    expect(pauseMs(true, true)).toBe(900);
    expect(pauseMs(false, false)).toBe(2200);
    expect(pauseMs(false, true)).toBe(3000);
  });
  it('builds the attempt payload', () => {
    const p = { prompt: 'q', answer: '4', answerType: 'int', keypad: { choices: ['a'] } };
    expect(buildAttemptPayload('s', p, '4', 10)).toEqual({
      skillId: 's', prompt: 'q', expected: '4', given: '4', ms: 10, answerType: 'int', requireSimplest: false, choices: ['a'],
    });
  });
  it('resolves progress and celebrations', () => {
    expect(resolveProgress(null, 2)).toEqual({ level: 2, prog: null, leveledUp: false });
    expect(resolveProgress({ progress: { levelHave: 3, levelNeed: 10 } }, 2).prog).toEqual({ have: 3, need: 10 });
    const up = resolveProgress({ leveledUp: true, progress: { levelHave: 10, levelNeed: 12, levelIndex: 3 } }, 2);
    expect(up).toEqual({ level: 3, prog: { have: 0, need: 12 }, leveledUp: true });
    expect(celebrationFor({ leveledUp: true }, 3)).toEqual({ kind: 'level', level: 4 });
    expect(celebrationFor({ masteredNow: true }, 3)).toEqual({ kind: 'mastered' });
    expect(celebrationFor({ leveledUp: true, masteredNow: true }, 1).kind).toBe('level');
    expect(celebrationFor(null, 1)).toBeNull();
  });
  it('title, pct, playable', () => {
    expect(skillTitle('Add (grade 2) numbers')).toBe('Add numbers');
    expect(progressPct({ have: 5, need: 10 })).toBe(50);
    expect(progressPct({ have: 50, need: 10 })).toBe(100);
    expect(progressPct({ have: 0, need: 0 })).toBe(0);
    expect(isPlayable({ unlocked: true, source: 'generated' })).toBe(true);
    expect(isPlayable({ unlocked: true, source: 'problems' })).toBe(false);
    expect(isPlayable(null)).toBe(false);
  });
});

describe('spelling logic', () => {
  it('labels grades', () => {
    expect([1, 2, 3, 4].map(gradeLabel)).toEqual(['1st', '2nd', '3rd', '4th']);
  });
  it('builds word params', () => {
    expect(buildWordParams(true, 3, 'core', 'u')).toEqual({});
    expect(buildWordParams(false, null, 'core', 'u')).toEqual({});
    expect(buildWordParams(false, 3, '', '')).toEqual({ grade: 3 });
    expect(buildWordParams(false, 3, 'core', 'u1')).toEqual({ grade: 3, tier: 'core', unit: 'u1' });
  });
  it('normalizes the words response', () => {
    expect(normalizeWordsResponse({ words: [1], grade: 2 })).toEqual({ words: [1], grade: 2 });
    expect(normalizeWordsResponse({ words: 'x', grade: 'y' })).toEqual({ words: [], grade: null });
    expect(normalizeWordsResponse(undefined)).toEqual({ words: [], grade: null });
  });
  it('hides the word, checks answers, picks', () => {
    expect(hiddenSentence('The Cat sat', 'cat')).toBe('The _____ sat');
    expect(hiddenSentence('', 'cat')).toBe('');
    expect(isCorrectSpelling('  CAT ', 'cat')).toBe(true);
    expect(isCorrectSpelling('cot', 'cat')).toBe(false);
    expect(spellingPauseMs(true)).toBe(1400);
    expect(spellingPauseMs(false)).toBe(2600);
    expect(pickRandom(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });
});
