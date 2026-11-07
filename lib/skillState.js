// Per-kid state of every math skill (unlocked / mastered / level / progress), used by GET /api/curriculum/me.
// Skills unlock in order within a grade. Once a skill has been unlocked it stays unlocked (SkillUnlock rows), even if the
// previous skill later stops being mastered (a miss on a fact shared with it clears that fact's mastered flag).
import { prisma } from './prisma';
import { writeAs, SeatLostError } from './guestWrite';
import { isSchemaMissing } from './dbErrors';
import { SKILLS, PROBLEM_SKILLS, isProblemSkill, parseProblemText, LEVEL_ADVANCE_WINDOW } from './mathSkills';

function computeProblemStats(tableFacts, userProblems) {
  const masteredText = new Set(userProblems.filter((u) => u.mastered).map((u) => u.problem.problem));
  const stats = {};
  for (const [id, match] of Object.entries(PROBLEM_SKILLS)) {
    let total = 0, done = 0;
    for (const p of tableFacts) {
      const ab = parseProblemText(p.problem);
      if (!ab || !match(ab[0], ab[1])) continue;
      total++;
      if (masteredText.has(p.problem)) done++;
    }
    stats[id] = { total, mastered: done };
  }
  return stats;
}

function buildProblemSkill(s, st) {
  return { ...s, source: 'problems', levelIndex: 0, mastered: st.total > 0 && st.mastered === st.total, problems: st, progress: null };
}

function buildGeneratedSkill(s, r) {
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
}

/**
 * Is this skill open? Rule: first skill of a grade, already mastered, already attempted, the previous skill (same grade, order - 1)
 * is mastered, or it was unlocked before (`persisted`: Set of skill ids from SkillUnlock). `all` is every built skill.
 */
export function isUnlocked(s, all, persisted = new Set()) {
  if (s.order === 1 || s.mastered || (s.progress?.attempts ?? 0) > 0 || persisted.has(s.id)) return true;
  const prev = all.find((p) => p.grade === s.grade && p.order === s.order - 1);
  return !prev || prev.mastered;
}

/** Record skills that are open now but not yet stored. Idempotent; a failure is logged and never breaks the request. */
async function persistUnlocks(actor, ids) {
  try {
    await writeAs(actor, (tx) => tx.skillUnlock.createMany({ data: ids.map((skillId) => ({ userId: actor.id, skillId })), skipDuplicates: true }));
  } catch (e) {
    if (!(e instanceof SeatLostError)) console.error('persisting skill unlocks failed', e); // a lost guest seat just means nothing to store
  }
}

/**
 * @param {number} uid @param {number|null} shownGrade null = every grade
 * @param {{id:number, gk?:string|null}} [actor] the caller (guest seats carry gk so the write is refused after a seat wipe)
 */
export async function buildSkillStates(uid, shownGrade, actor = { id: uid }) {
  const [rows, userProblems, tableFacts, unlockRows] = await Promise.all([
    prisma.mathSkillProgress.findMany({ where: { userId: uid } }),
    prisma.userProblem.findMany({ where: { userId: uid }, select: { mastered: true, problem: { select: { problem: true } } } }),
    prisma.problem.findMany({ select: { id: true, problem: true } }),
    // Code deployed before the migration: no table yet, so behave as before (nothing stored, nothing written).
    prisma.skillUnlock.findMany({ where: { userId: uid }, select: { skillId: true } }).catch((e) => {
      if (isSchemaMissing(e)) return null;
      throw e;
    }),
  ]);
  const progress = new Map(rows.map((r) => [r.skillId, r]));
  const persisted = new Set((unlockRows ?? []).map((r) => r.skillId));
  // Problem-table skills: count mastered UserProblem rows within each skill's factor set
  const problemStats = computeProblemStats(tableFacts, userProblems);

  const all = SKILLS.map((s) => (isProblemSkill(s.id) ? buildProblemSkill(s, problemStats[s.id]) : buildGeneratedSkill(s, progress.get(s.id))));
  const open = new Set(all.filter((s) => isUnlocked(s, all, persisted)).map((s) => s.id));
  // Backfills existing kids on their first load and records each new unlock (all grades, not just the one shown).
  const fresh = [...open].filter((id) => !persisted.has(id));
  if (unlockRows && fresh.length) await persistUnlocks(actor, fresh);
  const out = all
    .filter((s) => shownGrade == null || s.grade === shownGrade)
    .map((s) => ({ ...s, unlocked: open.has(s.id) }));
  out.sort((a, b) => a.grade - b.grade || a.order - b.order);
  return out;
}
