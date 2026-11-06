// Pure helpers for the "Ready, set, go" round intro: the step timeline, advancing, and the start-after-intro glue.

export const INTRO_SPEECH = 'Ready? 3, 2, 1, go!';
export const REDUCED_SPEECH = "Let's go!";

const FULL_STEPS = [
  { key: 'ready', label: null, ms: 900, pose: 'welcome' },
  { key: '3', label: '3', ms: 650, pose: 'welcome' },
  { key: '2', label: '2', ms: 650, pose: 'welcome' },
  { key: '1', label: '1', ms: 650, pose: 'welcome' },
  { key: 'go', label: 'GO!', ms: 600, pose: 'streak' },
];
const REDUCED_STEPS = [{ key: 'go', label: "Let's go!", ms: 1000, pose: 'idle' }];

/** Step list: `label: null` means "show Braylee's line". Reduced motion gets one static ~1s step. */
export function buildSteps(reduced = false) {
  return reduced ? REDUCED_STEPS : FULL_STEPS;
}

export const totalMs = (steps) => steps.reduce((sum, s) => sum + s.ms, 0);

/** Next step index, or -1 when the intro is over. */
export function nextIndex(steps, index) {
  return index + 1 < steps.length ? index + 1 : -1;
}

/** Which step is showing `elapsed` ms after the start (-1 once finished). */
export function stepAt(steps, elapsed) {
  let end = 0;
  for (let i = 0; i < steps.length; i += 1) {
    end += steps[i].ms;
    if (elapsed < end) return i;
  }
  return -1;
}

/** True for the keys that skip the intro. */
export const isSkipKey = (key) => key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'Escape';

/**
 * Run `onReady` once the round intro has finished or been skipped. Returns a cancel function (call it on
 * unmount / effect cleanup) so nothing runs afterwards. Safe against React strict mode because the
 * provider hands every caller the same in-flight intro promise.
 */
export function startAfterIntro(playIntro, onReady) {
  let cancelled = false;
  Promise.resolve(playIntro()).then(() => { if (!cancelled) onReady(); });
  return () => { cancelled = true; };
}
