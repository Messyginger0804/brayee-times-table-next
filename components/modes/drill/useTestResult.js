import { triggerFireworks } from '../../../lib/fireworks';
import { gameFx } from '../../../lib/gameFx';
import { recordStreak } from '../../../lib/bestStreak';

const CORRECT_PAUSE_MS = 900;
const WRONG_PAUSE_MS = 2200;

// Builds the onResult callback for Testing mode (scoring, feedback, pass/fail transitions).
export function useTestResult(ctx) {
  const { feedback, index, count, level, onLevelUp, timer, passedLevelRef, streak, setStreak, setScore, setAnswer, setStatus, setIndex, setPassed, setGameOver, setPassOpen, setLevelSaved } = ctx;

  const finishPass = async () => {
    // Level 1 pass: save the new level, but stay here so the celebration can show
    passedLevelRef.current = level;
    let saved = true;
    if (level === 1) { try { saved = (await onLevelUp({ stay: true })) !== false; } catch (_) { saved = false; } }
    setLevelSaved?.(saved);
    setPassed(true); setGameOver(true); setStatus(null); setAnswer('');
    setPassOpen(true);
  };

  const handleCorrect = (isLast) => {
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    setScore((s) => s + 1);
    feedback.correct({ streak: nextStreak, setComplete: isLast, newBest: !isLast && recordStreak('testing', nextStreak) });
    if (!isLast) {
      timer.current = setTimeout(() => { setAnswer(''); setStatus(null); setIndex((i) => i + 1); }, CORRECT_PAUSE_MS);
      return;
    }
    gameFx.emit('mastered');
    try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
    timer.current = setTimeout(finishPass, CORRECT_PAUSE_MS);
  };

  const handleWrong = () => {
    setStreak(0);
    feedback.wrong();
    timer.current = setTimeout(() => { setGameOver(true); setStatus(null); setAnswer(''); }, WRONG_PAUSE_MS);
  };

  return (isCorrect) => {
    if (isCorrect) handleCorrect(index === count - 1);
    else handleWrong();
  };
}
