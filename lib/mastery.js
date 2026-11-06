// UserProblem.mastered rule: a problem is mastered once the child has answered it correctly
// MASTERY_STREAK times in a row (the most recent attempts, which are kept per user+problem).
// Any miss clears it. Applied in POST /api/problems/[id]/attempt.
export const MASTERY_STREAK = 3;

/** attemptsNewestFirst: array of booleans (isCorrect), newest first. */
export function isMastered(attemptsNewestFirst) {
  const recent = attemptsNewestFirst.slice(0, MASTERY_STREAK);
  return recent.length === MASTERY_STREAK && recent.every(Boolean);
}
