// Skill index for the math curriculum. ONE source of truth: lib/curriculum/math/spec.json via getSkills().
// This file adds only app glue: the flat skill list the APIs use, and the mapping of times-table skills onto the
// existing Problem rows. Generators/checking/mastery live in lib/curriculum/math.
import { getSkills, getSkill as getLibSkill, masteryStatus } from './curriculum/math/index.js';

export const SKILLS = getSkills().map((s) => ({
  id: s.id,
  grade: s.grade,
  order: s.order,
  name: s.name,
  levelCount: Math.max(1, (s.levels || []).length),
  levelNames: (s.levels || []).map((l) => l.name),
  mastery: { accuracyPct: s.mastery.accuracyPct, secondsPerProblem: s.mastery.secondsPerProblem, window: s.mastery.window },
}));

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
export const getSkill = (id) => BY_ID.get(id) || null;
/** The full library skill (levels, generator, keypad...) for a flat skill id. */
export const getLibrarySkill = (id) => getLibSkill(id);
export const skillsForGrade = (grade) => SKILLS.filter((s) => s.grade === grade).sort((a, b) => a.order - b.order);

export { PROBLEM_SKILLS, isProblemSkill, parseProblemText } from './problemSkills';

// Advance to the next level after this many problems that meet the accuracy (and time) rule.
export const LEVEL_ADVANCE_WINDOW = 10;
export const WINDOW_DEFAULT = 20;

const asResults = (recent) => (Array.isArray(recent) ? recent : []).map((r) => ({ correct: !!r.c, ms: r.ms }));

/**
 * Level rule via the library's masteryStatus. Not on the last level: the last 10 problems at this level meet the
 * skill's accuracy + time rule -> level up. On the last level: the usual last-20 window -> skill mastered.
 * `recent` is the stored [{ c, ms }] window for the current level, oldest first.
 */
export function evaluateWindow(recent, skill, isLastLevel) {
  const results = asResults(recent);
  if (isLastLevel) return masteryStatus(results, { mastery: { ...skill.mastery, window: skill.mastery.window || WINDOW_DEFAULT } });
  return masteryStatus(results.slice(-LEVEL_ADVANCE_WINDOW), { mastery: { ...skill.mastery, window: LEVEL_ADVANCE_WINDOW } });
}
