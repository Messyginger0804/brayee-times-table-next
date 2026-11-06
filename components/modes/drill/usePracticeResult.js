import { triggerFireworks } from '../../../lib/fireworks';
import { recordStreak } from '../../../lib/bestStreak';
import { progressAfterCorrect, shouldOfferUnlock } from './attempts';

const PRACTICE_CORRECT_PAUSE_MS = 900;
const WRONG_PAUSE_MS = 2000;

function celebrate({ scoped, hasShownLevelUnlock, count, setHasShownLevelUnlock, setUnlockOpen }) {
  try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
  if (!shouldOfferUnlock({ scoped, alreadyShown: hasShownLevelUnlock, count })) return;
  setHasShownLevelUnlock(true);
  setTimeout(() => setUnlockOpen(true), PRACTICE_CORRECT_PAUSE_MS + 400);
}

// Builds the onResult callback for Practice mode (scoring, feedback, progress, auto-advance).
export function usePracticeResult(ctx) {
  const { feedback, problems, userProgress, setUserProgress, streak, setStreak, setStars, advanceTimer, setAnswer, setStatus, setIndex } = ctx;

  const handleCorrect = (card) => {
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    setStars((s) => s + 1);
    const { nextProgress, setComplete } = progressAfterCorrect(card, problems, userProgress);
    feedback.correct({ streak: nextStreak, setComplete, newBest: recordStreak('practice', nextStreak) });
    if (setUserProgress) setUserProgress(nextProgress);
    if (setComplete) celebrate({ ...ctx, count: problems.length });
  };

  return (isCorrect, card) => {
    if (isCorrect) handleCorrect(card);
    else { setStreak(0); feedback.wrong(); }
    advanceTimer.current = setTimeout(() => {
      setAnswer('');
      setStatus(null);
      setIndex((i) => (i + 1) % problems.length);
    }, isCorrect ? PRACTICE_CORRECT_PAUSE_MS : WRONG_PAUSE_MS);
  };
}
