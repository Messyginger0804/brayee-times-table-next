const CORRECT_PAUSE_MS = 900;
const WRONG_PAUSE_MS = 2200;
const HINT_EXTRA_MS = 800;

// Kid-friendly versions of the checker's hints
const KID_HINT = {
  'can you simplify?': 'Right! Can you simplify it?',
  'Right value! Write it in simplest form.': 'Right amount! Can you write it in simplest form?',
  'Check the sign (plus or minus).': 'Look at the plus or minus sign.',
  'Check where the decimal point goes.': 'Check where the decimal point goes.',
  "Don't forget the remainder (R).": "Don't forget the leftover (R).",
  'Your remainder is too big. Keep dividing!': 'The leftover is too big. Can you divide a bit more?',
};
export const kidHint = (h) => (h ? KID_HINT[h] || h : '');

/** How long the answer feedback stays up before the next question. */
export function pauseMs(isCorrect, hasHint) {
  if (isCorrect) return CORRECT_PAUSE_MS;
  return hasHint ? WRONG_PAUSE_MS + HINT_EXTRA_MS : WRONG_PAUSE_MS;
}

export function buildAttemptPayload(skillId, p, given, ms) {
  return {
    skillId, prompt: p.prompt, expected: p.answer, given, ms,
    answerType: p.answerType, requireSimplest: !!p.requireSimplest, choices: p.keypad?.choices || undefined,
  };
}

/** Folds the server's attempt response into the level and progress bar. `prog` is null when unchanged. */
export function resolveProgress(data, currentLevel) {
  let prog = null;
  let level = currentLevel;
  if (data?.progress) prog = { have: data.progress.levelHave, need: data.progress.levelNeed };
  // The server's level is the truth on every response, so a missed level-up response heals on the next attempt
  if (Number.isInteger(data?.progress?.levelIndex)) level = data.progress.levelIndex;
  if (data?.leveledUp) {
    prog = { have: 0, need: data.progress.levelNeed };
  }
  return { level, prog, leveledUp: !!data?.leveledUp };
}

/** The celebration (if any) after the pause: level-up beats mastered. */
export function celebrationFor(data, level) {
  if (data?.leveledUp) return { kind: 'level', level: level + 1 };
  return data?.masteredNow ? { kind: 'mastered' } : null;
}

export const skillTitle = (name) => name.replace(/\s*\([^)]*\)/g, '');
export const progressPct = (prog) => Math.min(100, Math.round((prog.have / Math.max(1, prog.need)) * 100));

export const isPlayable = (skill) => !!skill && !!skill.unlocked && skill.source === 'generated';
