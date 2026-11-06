import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  prisma: { mathSkillProgress: { findMany: vi.fn() }, userProblem: { findMany: vi.fn() }, problem: { findMany: vi.fn() } },
}));
import { prisma } from '../../lib/prisma';
import { SKILLS, PROBLEM_SKILLS, isProblemSkill, LEVEL_ADVANCE_WINDOW } from '../../lib/mathSkills';
import { buildSkillStates } from '../../lib/skillState';

const generated = SKILLS.filter((s) => !isProblemSkill(s.id));
const g = (s) => generated.find(s);

beforeEach(() => {
  vi.clearAllMocks();
  prisma.mathSkillProgress.findMany.mockResolvedValue([]);
  prisma.userProblem.findMany.mockResolvedValue([]);
  prisma.problem.findMany.mockResolvedValue([]);
});

const find = (out, id) => out.find((s) => s.id === id);

describe('buildSkillStates', () => {
  it('scopes every query to the user', async () => {
    await buildSkillStates(7, null);
    expect(prisma.mathSkillProgress.findMany).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(prisma.userProblem.findMany.mock.calls[0][0].where).toEqual({ userId: 7 });
  });

  it('returns every skill for null, only that grade otherwise, sorted by grade then order', async () => {
    const all = await buildSkillStates(7, null);
    expect(all).toHaveLength(SKILLS.length);
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].grade < all[i].grade || (all[i - 1].grade === all[i].grade && all[i - 1].order <= all[i].order)).toBe(true);
    }
    const g3 = await buildSkillStates(7, 3);
    expect(g3.length).toBeGreaterThan(0);
    expect(g3.every((s) => s.grade === 3)).toBe(true);
    expect(g3.length).toBe(SKILLS.filter((s) => s.grade === 3).length);
  });

  it('a fresh kid: first skill of each grade unlocked, the second locked, nothing mastered', async () => {
    const out = await buildSkillStates(7, null);
    for (const s of out.filter((x) => x.order === 1)) expect(s.unlocked).toBe(true);
    const second = out.find((s) => s.order === 2);
    expect(second.unlocked).toBe(false);
    expect(out.every((s) => !s.mastered || s.source === 'problems')).toBe(true);
  });

  it('generated skills with no progress row get zeroed progress', async () => {
    const s = find(await buildSkillStates(7, null), g((x) => x.order === 1).id);
    expect(s).toMatchObject({ source: 'generated', levelIndex: 0, mastered: false });
    expect(s.progress).toEqual({ attempts: 0, correct: 0, windowSize: 0, windowAccuracy: null, levelNeed: LEVEL_ADVANCE_WINDOW, levelHave: 0 });
  });

  it('computes window stats from stored progress (accuracy over the whole stored window)', async () => {
    const sk = g((x) => x.levelCount > 1);
    prisma.mathSkillProgress.findMany.mockResolvedValue([
      { skillId: sk.id, levelIndex: 0, attempts: 6, correct: 4, mastered: false, recent: [{ c: true }, { c: false }, { c: true }] },
    ]);
    const s = find(await buildSkillStates(7, null), sk.id);
    expect(s.progress).toEqual({ attempts: 6, correct: 4, windowSize: 3, windowAccuracy: 67, levelNeed: LEVEL_ADVANCE_WINDOW, levelHave: 3 });
  });

  it('on the last level the needed window is the skill window (default 20) and levelHave is capped by it', async () => {
    const sk = g((x) => x.levelCount > 1);
    const need = sk.mastery.window || 20;
    prisma.mathSkillProgress.findMany.mockResolvedValue([
      { skillId: sk.id, levelIndex: 50, attempts: 99, correct: 90, mastered: true, recent: Array.from({ length: need + 5 }, () => ({ c: true })) },
    ]);
    const s = find(await buildSkillStates(7, null), sk.id);
    expect(s.levelIndex).toBe(sk.levelCount - 1); // clamped
    expect(s.mastered).toBe(true);
    expect(s.progress.levelNeed).toBe(need);
    expect(s.progress.levelHave).toBe(need);
    expect(s.progress.windowAccuracy).toBe(100);
  });

  it('non-array recent is treated as empty', async () => {
    const sk = g((x) => x.order === 1);
    prisma.mathSkillProgress.findMany.mockResolvedValue([{ skillId: sk.id, levelIndex: 0, attempts: 1, correct: 0, recent: null }]);
    expect(find(await buildSkillStates(7, null), sk.id).progress.windowSize).toBe(0);
  });

  it('a skill with attempts is unlocked even if its predecessor is not mastered', async () => {
    const sk = g((x) => x.order === 2);
    prisma.mathSkillProgress.findMany.mockResolvedValue([{ skillId: sk.id, levelIndex: 0, attempts: 1, correct: 1, recent: [] }]);
    expect(find(await buildSkillStates(7, null), sk.id).unlocked).toBe(true);
  });

  it('mastering a skill unlocks the next one in the same grade', async () => {
    const prev = g((x) => x.order === 1 && generated.some((y) => y.grade === x.grade && y.order === 2));
    const next = generated.find((y) => y.grade === prev.grade && y.order === 2);
    prisma.mathSkillProgress.findMany.mockResolvedValue([{ skillId: prev.id, levelIndex: 0, attempts: 30, correct: 30, mastered: true, recent: [] }]);
    const out = await buildSkillStates(7, null);
    expect(find(out, next.id).unlocked).toBe(true);
  });

  it('a gap in the order numbering leaves the skill unlocked (no predecessor to wait for)', async () => {
    // skills whose order-1 neighbour does not exist in their grade must report unlocked
    const out = await buildSkillStates(7, null);
    for (const s of out.filter((x) => x.order > 1)) {
      const prev = out.find((p) => p.grade === s.grade && p.order === s.order - 1);
      if (!prev) expect(s.unlocked).toBe(true);
    }
  });

  describe('times-table (problem-backed) skills', () => {
    const pid = Object.keys(PROBLEM_SKILLS)[0];
    const match = PROBLEM_SKILLS[pid];
    const facts = [];
    for (let a = 1; a <= 15; a++) for (let b = 1; b <= 15; b++) facts.push({ id: a * 100 + b, problem: `${a} x ${b}` });

    it('no mastered rows -> not mastered, totals counted from the fact table', async () => {
      prisma.problem.findMany.mockResolvedValue(facts);
      const s = find(await buildSkillStates(7, null), pid);
      const total = facts.filter((f) => { const [a, b] = f.problem.split(' x ').map(Number); return match(a, b); }).length;
      expect(s).toMatchObject({ source: 'problems', levelIndex: 0, mastered: false, progress: null });
      expect(s.problems).toEqual({ total, mastered: 0 });
    });

    it('mastered once every matching fact is mastered; unmastered rows and unparsable facts are ignored', async () => {
      const matching = facts.filter((f) => { const [a, b] = f.problem.split(' x ').map(Number); return match(a, b); });
      prisma.problem.findMany.mockResolvedValue([...facts, { id: 1, problem: 'weird' }]);
      prisma.userProblem.findMany.mockResolvedValue([
        ...matching.map((f) => ({ mastered: true, problem: { problem: f.problem } })),
        { mastered: false, problem: { problem: '99 x 99' } },
      ]);
      const s = find(await buildSkillStates(7, null), pid);
      expect(s.problems.mastered).toBe(matching.length);
      expect(s.mastered).toBe(true);
    });

    it('a skill with zero matching facts is never "mastered"', async () => {
      prisma.problem.findMany.mockResolvedValue([]);
      const s = find(await buildSkillStates(7, null), pid);
      expect(s.problems).toEqual({ total: 0, mastered: 0 });
      expect(s.mastered).toBe(false);
    });
  });
});
