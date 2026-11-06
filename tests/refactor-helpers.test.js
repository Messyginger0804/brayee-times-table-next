import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { buildTimesTableProblems } from '../lib/timesTableProblems';
import { parseSpellingQuery, buildSpellingWhere } from '../lib/spellingQuery';

const require = createRequire(import.meta.url);
const { groupBy, mergeProgress, mergeUserProblemRows } = require('../scripts/lib/accountMerge');
const { planSpecWords, planLegacyWords, toInsertRow } = require('../scripts/lib/spellingImport');

describe('buildTimesTableProblems', () => {
  it('builds 144 rows of 1x1..12x12', () => {
    const d = buildTimesTableProblems();
    expect(d).toHaveLength(144);
    expect(d[0]).toEqual({ problem: '1 x 1', answer: 1 });
    expect(d[143]).toEqual({ problem: '12 x 12', answer: 144 });
  });
});

describe('spelling query', () => {
  const q = (s) => parseSpellingQuery(new URLSearchParams(s));
  it('parses valid and empty queries', () => {
    expect(q('')).toEqual({ grade: null, unit: null, tier: null });
    expect(q('grade=3&unit=g3u6&tier=hf')).toEqual({ grade: 3, unit: 'g3u6', tier: 'hf' });
    expect(q('grade=')).toEqual({ grade: null, unit: null, tier: null });
  });
  it('rejects bad values', () => {
    expect(q('grade=7').error).toBe('grade must be 1-6');
    expect(q('grade=x').error).toBe('grade must be 1-6');
    expect(q('tier=zzz').error).toBe('tier must be core, hf or bee');
    expect(q('unit=a-b').error).toBe('invalid unit');
  });
  it('builds where', () => {
    expect(buildSpellingWhere({ grade: null, unit: null, tier: null })).toEqual({ active: true });
    expect(buildSpellingWhere({ grade: 2, unit: 'u', tier: 'bee' })).toEqual({ active: true, grade: 2, unitId: 'u', tier: 'bee' });
  });
});

describe('accountMerge helpers', () => {
  it('groupBy keeps order', () => {
    const m = groupBy([{ k: 1, v: 'a' }, { k: 2, v: 'b' }, { k: 1, v: 'c' }], (r) => r.k);
    expect([...m.keys()]).toEqual([1, 2]);
    expect(m.get(1).map((r) => r.v)).toEqual(['a', 'c']);
  });
  it('mergeProgress sums and takes highest level window', () => {
    const d = (n) => new Date(2024, 0, n);
    const r = mergeProgress([
      { levelIndex: 1, recent: [{ c: 1 }], attempts: 2, correct: 1, mastered: false, masteredAt: null, unlockedByParent: false, createdAt: d(2), updatedAt: d(3) },
      { levelIndex: 2, recent: [{ c: 0 }], attempts: 3, correct: 2, mastered: true, masteredAt: d(5), unlockedByParent: true, createdAt: d(1), updatedAt: d(4) },
    ]);
    expect(r).toMatchObject({ levelIndex: 2, attempts: 5, correct: 3, mastered: true, unlockedByParent: true });
    expect(r.recent).toEqual([{ c: 0 }]);
    expect(r.createdAt).toEqual(d(1));
    expect(r.updatedAt).toEqual(d(4));
  });
  it('mergeUserProblemRows uses history only on conflicts', () => {
    const rows = [
      { userId: 1, mastered: false, everCorrect: false, updatedAt: new Date(1) },
      { userId: 2, mastered: true, everCorrect: true, updatedAt: new Date(5) },
    ];
    const r = mergeUserProblemRows(rows, 1, [true], () => false);
    expect(r.conflict).toBe(true);
    expect(r.own).toBe(rows[0]);
    expect(r.data).toEqual({ everCorrect: true, mastered: false, updatedAt: new Date(5) });
    const single = mergeUserProblemRows([rows[1]], 1, [true], () => false);
    expect(single.conflict).toBe(false);
    expect(single.own).toBeUndefined();
    expect(single.data.mastered).toBe(true);
    expect(mergeUserProblemRows(rows, 1, undefined, () => false).data.mastered).toBe(true);
  });
});

describe('spellingImport helpers', () => {
  const w = { word: 'cat', grade: 1, unitId: 'g1u1', tier: 'core', syllables: 1 };
  it('inserts new words and dedupes', () => {
    const p = planSpecWords([w, w], new Map());
    expect(p.toInsert).toHaveLength(1);
    expect(p.toInsert[0]).toEqual(toInsertRow(w));
    expect(p.toInsert[0]).toMatchObject({ category: 'g1u1', active: true, source: 'original' });
  });
  it('fills only nulls, skips grade conflicts', () => {
    const byWord = new Map([['cat', { id: 7, word: 'cat', grade: 1, unitId: null, tier: 'core', syllables: null, source: null, category: null }]]);
    const p = planSpecWords([w], byWord);
    expect(p.updates).toEqual([{ id: 7, data: { unitId: 'g1u1', syllables: 1, category: 'g1u1' } }]);
    const c = planSpecWords([{ ...w, grade: 2 }], byWord);
    expect(c.conflicts).toBe(1);
    expect(c.updates).toEqual([]);
  });
  it('plans legacy fills', () => {
    const byWord = new Map([['dog', { id: 9, grade: null, unitId: null, category: 'x', source: null }]]);
    const r = planLegacyWords([{ word: 'dog', grade: 1, unitId: 'u' }, { word: 'cat', grade: 1, unitId: 'u' }, { word: 'seen', grade: 1, unitId: 'u' }], byWord, new Set(['seen']));
    expect(r.missing).toBe(1);
    expect(r.updates).toEqual([{ id: 9, data: { grade: 1, unitId: 'u', source: 'legacy' } }]);
  });
});
