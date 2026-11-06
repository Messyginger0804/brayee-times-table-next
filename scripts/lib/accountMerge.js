// Pure helpers for scripts/cleanup-accounts.js (no DB access here).

const maxDate = (...ds) => ds.filter(Boolean).reduce((a, b) => (a && a > b ? a : b), null);
const minDate = (...ds) => ds.filter(Boolean).reduce((a, b) => (a && a < b ? a : b), null);

/** Group rows into a Map keyed by key(row), preserving first-seen order. */
function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function mergeProgress(rows) {
  const top = Math.max(...rows.map((r) => r.levelIndex));
  const atTop = rows.filter((r) => r.levelIndex === top).sort((a, b) => a.updatedAt - b.updatedAt);
  const recent = [];
  for (const r of atTop) recent.push(...(Array.isArray(r.recent) ? r.recent : []));
  return {
    levelIndex: top,
    recent: recent.slice(-20),
    attempts: rows.reduce((n, r) => n + r.attempts, 0),
    correct: rows.reduce((n, r) => n + r.correct, 0),
    mastered: rows.some((r) => r.mastered),
    masteredAt: maxDate(...rows.map((r) => r.masteredAt)),
    unlockedByParent: rows.some((r) => r.unlockedByParent),
    createdAt: minDate(...rows.map((r) => r.createdAt)),
    updatedAt: maxDate(...rows.map((r) => r.updatedAt)),
  };
}

/**
 * Merge the UserProblem rows of one problem (several accounts) into the KEEP account's values.
 * `history` is the newest-first isCorrect list for that problem (or undefined).
 * Returns { own, conflict, data: { everCorrect, mastered, updatedAt } }.
 */
function mergeUserProblemRows(rows, keepId, history, isMastered) {
  const conflict = rows.length > 1;
  let mastered = rows.some((r) => r.mastered);
  if (conflict && isMastered && history && history.length) mastered = isMastered(history);
  return {
    own: rows.find((r) => r.userId === keepId),
    conflict,
    data: {
      everCorrect: rows.some((r) => r.everCorrect),
      mastered,
      updatedAt: maxDate(...rows.map((r) => r.updatedAt)),
    },
  };
}

module.exports = { maxDate, minDate, groupBy, mergeProgress, mergeUserProblemRows };
