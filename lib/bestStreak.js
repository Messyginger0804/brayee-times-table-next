// Per-device best streak (UI-only; no server contract involved). Used to celebrate a "new best".
const key = (mode) => `braylee.bestStreak.${mode}`;

function getBestStreak(mode) {
  try { return parseInt(window.localStorage.getItem(key(mode)) || '0', 10) || 0; } catch (_) { return 0; }
}

/** Records the streak and returns true if it beat a previous best of at least 3. */
export function recordStreak(mode, streak) {
  const best = getBestStreak(mode);
  if (streak <= best) return false;
  try { window.localStorage.setItem(key(mode), String(streak)); } catch (_) {}
  return best >= 3;
}
