"use client";
import { useState } from 'react';
import PlayerHeader from './modes/drill/PlayerHeader';
import Screen from './ui/Screen';
import GameHud from './game/GameHud';
import { useFeedback, GifSlot } from './gif/GifProvider';
import NoProblemsScreen from './modes/drill/NoProblemsScreen';
import DrillBoard from './modes/drill/DrillBoard';
import UnlockModal from './modes/drill/UnlockModal';
import { useDrillInput, useDrillSubmit, useDrillTimer } from './modes/drill/useDrillSubmit';
import { useStreakTotal, useUnlockState } from './modes/drill/useDrillState';
import { usePracticeResult } from './modes/drill/usePracticeResult';

function PracticeMode({ user, problems, level, onReset, scoped = false, attemptSummaries = {}, setAttemptSummaries, userProgress = {}, setUserProgress }) {
  const feedback = useFeedback();
  const [index, setIndex] = useState(0);
  const { answer, setAnswer, status, setStatus, hint, setHint } = useDrillInput();
  const { streak, setStreak, total: stars, setTotal: setStars } = useStreakTotal();
  const { unlockOpen, setUnlockOpen, hasShownLevelUnlock, setHasShownLevelUnlock } = useUnlockState();
  const advanceTimer = useDrillTimer(feedback);

  const current = problems[index];

  const onResult = usePracticeResult({
    feedback, problems, scoped, userProgress, setUserProgress, streak, setStreak, setStars, advanceTimer,
    setAnswer, setStatus, setIndex, hasShownLevelUnlock, setHasShownLevelUnlock, setUnlockOpen,
  });

  const submit = useDrillSubmit({ current, answer, status, setStatus, setHint, attemptSummaries, setAttemptSummaries, onResult });

  if (problems.length === 0) return <NoProblemsScreen user={user} onReset={onReset} />;

  return (
    <Screen>
      <PlayerHeader user={user} onReset={onReset} />
      <h1 className="sr-only">Practice Mode</h1>
      <GameHud level={level} streak={streak} score={stars} />
      <GifSlot />
      <DrillBoard current={current} answer={answer} setAnswer={setAnswer} status={status} hint={hint} attemptSummaries={attemptSummaries} submit={submit} />
      <UnlockModal open={unlockOpen} setOpen={setUnlockOpen} onReset={onReset} />
    </Screen>
  );
}

export default PracticeMode;
