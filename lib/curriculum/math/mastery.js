// Mastery rule from the spec: accuracy over the last `window` problems, each answered within secondsPerProblem.
// Facts use 95%, computation 90% (the percentage lives on each skill's mastery block).

/**
 * @typedef {{correct:boolean, seconds?:number|null, ms?:number|null, levelIndex?:number}} Result
 */

const secondsOf = (r) => (typeof r.seconds === 'number' ? r.seconds : typeof r.ms === 'number' ? r.ms / 1000 : null);
const round1 = (x) => Math.round(x * 10) / 10;

function evaluate(results, mastery, requireTime) {
  const { accuracyPct, secondsPerProblem, window } = mastery;
  const last = results.slice(-window);
  const n = last.length;
  const correct = last.filter((r) => r.correct).length;
  const good = last.filter((r) => {
    if (!r.correct) return false;
    if (!requireTime) return true;
    const s = secondsOf(r);
    return s !== null && s <= secondsPerProblem;
  }).length;
  const qualifyingPct = n ? (good / n) * 100 : 0;
  const mastered = n >= window && qualifyingPct >= accuracyPct;
  let reason = null;
  if (!mastered) {
    if (n < window) reason = `Needs ${window - n} more problem${window - n === 1 ? '' : 's'}.`;
    else if ((correct / n) * 100 < accuracyPct) reason = `Accuracy ${round1((correct / n) * 100)}% is below ${accuracyPct}%.`;
    else reason = `Too slow: only ${round1(qualifyingPct)}% were correct within ${secondsPerProblem}s.`;
  }
  return {
    mastered,
    attempts: n,
    window,
    accuracyPct: n ? round1((correct / n) * 100) : 0,
    qualifyingPct: round1(qualifyingPct),
    target: { accuracyPct, secondsPerProblem },
    reason,
  };
}

/**
 * @param {Result[]} results oldest first. A result counts only if correct AND within the time target.
 * @param {{mastery:{accuracyPct:number,secondsPerProblem:number,window:number}, levels?:object[]}} skill
 * @param {{requireTime?: boolean}} [opts] requireTime:false = accuracy only (untimed practice)
 *   If results carry levelIndex, every level of the skill must be mastered ("mastered when all levels meet it").
 */
export function masteryStatus(results, skill, opts = {}) {
  const requireTime = opts.requireTime !== false;
  const list = Array.isArray(results) ? results : [];
  const byLevelMode = list.some((r) => typeof r.levelIndex === 'number') && Array.isArray(skill.levels);
  if (!byLevelMode) return evaluate(list, skill.mastery, requireTime);
  const byLevel = skill.levels.map((_, i) => evaluate(list.filter((r) => r.levelIndex === i), skill.mastery, requireTime));
  const first = byLevel.findIndex((l) => !l.mastered);
  return {
    mastered: first === -1,
    attempts: byLevel.reduce((s, l) => s + l.attempts, 0),
    window: skill.mastery.window,
    target: { accuracyPct: skill.mastery.accuracyPct, secondsPerProblem: skill.mastery.secondsPerProblem },
    reason: first === -1 ? null : `Level ${first + 1}: ${byLevel[first].reason}`,
    byLevel,
  };
}
