import { PROBLEM_SKILLS, parseProblemText } from '../../../lib/problemSkills';

export function shuffleArray(array) {
  const out = [...array];
  let i = out.length;
  while (i !== 0) {
    const j = Math.floor(Math.random() * i);
    i--;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const inSkill = (match) => (p) => {
  const ab = parseProblemText(p.problem);
  return !!ab && !!match(ab[0], ab[1]);
};

const levelOneOnly = (p) => {
  const [a, b] = p.problem.split(' x ').map(Number);
  return a <= 5 && b <= 5;
};

/** Which problems the player sees: a scoped mission's fact set, level 1's small tables, or everything. */
export function selectProblems(problems, user, scopedSkill) {
  if (scopedSkill && PROBLEM_SKILLS[scopedSkill]) return problems.filter(inSkill(PROBLEM_SKILLS[scopedSkill]));
  if (user.level === 1) return problems.filter(levelOneOnly);
  return problems;
}

export function idsToMap(ids) {
  const map = {};
  (ids || []).forEach((id) => { map[id] = true; });
  return map;
}

export function normalizeCurriculum(data) {
  return { grade: data?.grade ?? null, skills: Array.isArray(data?.skills) ? data.skills : [] };
}

/** Practice progress that gates Testing mode. */
export function testingStats(problems, userProgress) {
  const totalCount = problems.length;
  const completedCount = problems.filter((p) => userProgress[p.id]).length;
  return {
    totalCount,
    completedCount,
    canUseTesting: totalCount > 0 && completedCount === totalCount,
    pct: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

/** What tapping a mission on the map does. */
export function missionAction(skill) {
  if (!skill.unlocked) return 'locked';
  return skill.source === 'problems' ? 'choose' : 'route';
}

export function testingCopy({ canUseTesting, totalCount, completedCount }) {
  return canUseTesting
    ? `All ${totalCount} completed. Testing unlocked!`
    : `Completed ${completedCount} / ${totalCount} to unlock Testing`;
}

/** Tap handler for the mission map: locked and problem-based missions open a dialog, generated ones their own page. */
export const makePickMission = (router, setPickedSkill) => (skill) => {
  const action = missionAction(skill);
  if (action === 'route') router.push(`/skill/${encodeURIComponent(skill.id)}`);
  else setPickedSkill(action === 'locked' ? { ...skill, locked: true } : skill);
};
