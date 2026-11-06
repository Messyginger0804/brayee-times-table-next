// Math practice problem library for grades 1-6. Pure JS: no UI, DB or network.
// Spec source: docs/curriculum/math.json (copied to ./spec.json). See lib/curriculum/README.md.
import spec from './spec.json';
import { build } from './build.js';
import { createRng, getDefaultRng } from './rng.js';
import { checkAnswer } from './check.js';
import { masteryStatus } from './mastery.js';
import { getMultiplicationFacts, MULT_SETS } from './facts.js';
import { handlers as whole } from './gen/whole.js';
import { handlers as mult } from './gen/mult.js';
import { handlers as fractions } from './gen/fractions.js';
import { handlers as decimals } from './gen/decimals.js';
import { handlers as misc } from './gen/misc.js';

export { createRng, checkAnswer, masteryStatus, getMultiplicationFacts, MULT_SETS };

const HANDLERS = { ...whole, ...mult, ...fractions, ...decimals, ...misc };

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}

const SKILLS = deepFreeze(
  spec.grades.flatMap((g) =>
    g.skills.map((s) => ({
      ...s,
      grade: g.grade,
      answerType: s.generator.answerType,
      inputMode: s.generator.inputMode,
    })),
  ),
);
const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

/**
 * @param {number} [grade] 1-6; omit for every skill (ordered by grade, then teaching order)
 */
export function getSkills(grade) {
  return grade === undefined ? SKILLS.slice() : SKILLS.filter((s) => s.grade === Number(grade));
}

/** @returns the skill, or null when the id is unknown */
export function getSkill(id) {
  return BY_ID.get(id) || null;
}

function keypadFor(skill, frag) {
  const has = new Set(skill.keypad);
  const k = {
    digits: true,
    minus: has.has('minus'),
    decimal: has.has('decimal-point'),
    fractionSlash: has.has('fraction-slash'),
    mixedSpace: has.has('mixed-number-space'),
    remainder: false,
    compare: has.has('choice-symbols'),
    yesNo: false,
    choices: null,
    maxDigits: 7,
    ...(frag.keypad || {}),
  };
  if (frag.choices) {
    k.digits = false;
    k.choices = frag.choices;
    k.yesNo = frag.choices[0] === 'yes';
  }
  if (frag.answerType === 'symbol' || k.compare) {
    k.digits = false;
    k.compare = true;
    k.choices = ['<', '>', '='];
  }
  return k;
}

/**
 * Generate one problem. Pass a seeded rng from createRng for deterministic output.
 * The same rng never returns the same prompt twice in a row for a given skill+level.
 * @param {string} skillId
 * @param {number} [levelIndex] 0-based index into skill.levels (levelIndex 0 = "<id>.L1")
 * @param {import('./rng.js').Rng} [rng]
 */
export function generateProblem(skillId, levelIndex = 0, rng) {
  const skill = getSkill(skillId);
  if (!skill) throw new RangeError(`Unknown math skill: ${skillId}`);
  const level = skill.levels[levelIndex];
  if (!Number.isInteger(levelIndex) || !level)
    throw new RangeError(`Skill ${skillId} has no level index ${levelIndex} (0..${skill.levels.length - 1})`);
  const handler = HANDLERS[skillId];
  if (!handler) throw new Error(`No generator for skill ${skillId}`);
  const r = rng || getDefaultRng();
  const key = level.id;
  let frag;
  let built;
  for (let attempt = 0; attempt < 40; attempt++) {
    frag = handler(r, { params: level.params, index: levelIndex, skill });
    built = build(frag.items);
    if (built.prompt !== r.recent.get(key)) break;
  }
  r.recent.set(key, built.prompt);
  const answer = String(frag.answer);
  let answerType = frag.answerType || skill.answerType;
  if (answerType === 'mixed') answerType = 'integer';
  const problem = {
    skillId,
    levelIndex,
    prompt: built.prompt,
    promptParts: built.promptParts,
    answer,
    answerDisplay: frag.answerDisplay || answer.replace(/-/g, '−'),
    answerType,
    keypad: keypadFor(skill, frag),
    timeLimit: level.params.timed === false ? null : level.params.timeLimit ?? null,
    meta: frag.meta || {},
  };
  if (frag.requireSimplest) problem.requireSimplest = true;
  return problem;
}
