import { useState } from 'react';

// Current streak plus a running total (stars in Practice, score in Testing).
export function useStreakTotal() {
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  return { streak, setStreak, total, setTotal };
}

// Practice: level-unlock dialog open state and whether it was already shown.
export function useUnlockState() {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [hasShownLevelUnlock, setHasShownLevelUnlock] = useState(false);
  return { unlockOpen, setUnlockOpen, hasShownLevelUnlock, setHasShownLevelUnlock };
}

// Testing: end-of-test phase flags.
export function useTestPhase() {
  const [gameOver, setGameOver] = useState(false);
  const [passed, setPassed] = useState(false); // finished every question
  const [passOpen, setPassOpen] = useState(false);
  return { gameOver, setGameOver, passed, setPassed, passOpen, setPassOpen };
}
