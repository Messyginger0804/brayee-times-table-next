// Per-kid state of every math skill (unlocked / mastered / level / progress), used by GET /api/curriculum/me.
// Skills unlock in order within a grade.
import { prisma } from './prisma';
import { SKILLS, PROBLEM_SKILLS, isProblemSkill, parseProblemText, LEVEL_ADVANCE_WINDOW } from './mathSkills';

/** @param {number} uid @param {number|null} shownGrade null = every grade */
export async function buildSkillStates(uid, shownGrade) {
  const [rows, userProblems, tableFacts] = await Promise.all([
    prisma.mathSkillProgress.findMany({ where: { userId: uid } }),
    prisma.userProblem.findMany({ where: { userId: uid }, select: { mastered: true, problem: { select: { problem: true } } } }),
    prisma.problem.findMany({ select: { id: true, problem: true } }),
  ]);
  const progress = new Map(rows.map((r) => [r.skillId, r]));

  // Problem-table skills: count mastered UserProblem rows within each skill's factor set
  const masteredText = new Set(userProblems.filter((u) => u.mastered).map((u) => u.problem.problem));
  const problemStats = {};
  for (const [id, match] of Object.entries(PROBLEM_SKILLS)) {
    let total = 0, done = 0;
    for (const p of tableFacts) {
      const ab = parseProblemText(p.problem);
      if (ab && match(ab[0], ab[1])) { total++; if (masteredText.has(p.problem)) done++; }
    }
    problemStats[id] = { total, mastered: done };
  }

  const build = (s) => {
    const r = progress.get(s.id);
    if (isProblemSkill(s.id)) {
      const st = problemStats[s.id];
      return { ...s, source: 'problems', levelIndex: 0, mastered: st.total > 0 && st.mastered === st.total, problems: st, progress: null };
    }
    const recent = Array.isArray(r?.recent) ? r.recent : [];
    const last = (r?.levelIndex ?? 0) >= s.levelCount - 1;
    const need = last ? (s.mastery.window || 20) : LEVEL_ADVANCE_WINDOW;
    const win = recent.slice(-need);
    return {
      ...s, source: 'generated', levelIndex: Math.min(r?.levelIndex ?? 0, s.levelCount - 1), mastered: !!r?.mastered,
      progress: {
        attempts: r?.attempts ?? 0, correct: r?.correct ?? 0, windowSize: recent.length,
        windowAccuracy: recent.length ? Math.round((recent.filter((x) => x.c).length / recent.length) * 100) : null,
        levelNeed: need, levelHave: win.length,
      },
    };
  };

  const all = SKILLS.map(build);
  const out = [];
  for (const s of all) {
    const prev = all.find((p) => p.grade === s.grade && p.order === s.order - 1);
    const unlocked = s.order === 1 || !prev || prev.mastered || s.mastered || (s.progress?.attempts ?? 0) > 0;
    if (shownGrade == null || s.grade === shownGrade) out.push({ ...s, unlocked });
  }
  out.sort((a, b) => a.grade - b.grade || a.order - b.order);
  return out;
}
