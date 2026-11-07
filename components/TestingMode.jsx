"use client";
import { useRef, useState } from 'react';
import PlayerHeader from './modes/drill/PlayerHeader';
import Screen from './ui/Screen';
import GameHud from './game/GameHud';
import { useFeedback, GifSlot } from './gif/GifProvider';
import NoProblemsScreen from './modes/drill/NoProblemsScreen';
import DrillBoard from './modes/drill/DrillBoard';
import TestResult from './modes/drill/TestResult';
import { useStreakTotal, useTestPhase } from './modes/drill/useDrillState';
import { useTestResult } from './modes/drill/useTestResult';
import { useDrillInput, useDrillSubmit, useDrillTimer } from './modes/drill/useDrillSubmit';

function TestingMode({ user, problems, level, onLevelUp, onReset, attemptSummaries = {}, setAttemptSummaries }) {
  const feedback = useFeedback();
  const [index, setIndex] = useState(0);
  const { streak, setStreak, total: score, setTotal: setScore } = useStreakTotal();
  const { gameOver, setGameOver, passed, setPassed, passOpen, setPassOpen } = useTestPhase();
  const { answer, setAnswer, status, setStatus, hint, setHint } = useDrillInput();
  const [levelSaved, setLevelSaved] = useState(true); // false when the Level 1 pass could not be saved
  const timer = useDrillTimer(feedback);
  const passedLevelRef = useRef(level);

  const restartGame = () => {
    setIndex(0); setScore(0); setGameOver(false); setPassed(false); setAnswer(''); setStatus(null); setStreak(0);
    feedback.startSession({ withGif: false, intro: true });
  };

  const current = problems[index];

  const onResult = useTestResult({
    feedback, index, count: problems.length, level, onLevelUp, timer, passedLevelRef, streak, setStreak, setScore,
    setAnswer, setStatus, setIndex, setPassed, setGameOver, setPassOpen, setLevelSaved,
  });
  const retrySave = async () => {
    let saved = false;
    try { saved = (await onLevelUp({ stay: true })) !== false; } catch (_) {}
    setLevelSaved(saved);
  };

  const submit = useDrillSubmit({ current, answer, status, setStatus, setHint, attemptSummaries, setAttemptSummaries, onResult });

  if (gameOver) {
    return (
      <TestResult
        user={user}
        onReset={onReset}
        onRetry={restartGame}
        passed={passed}
        score={score}
        passOpen={passOpen}
        setPassOpen={setPassOpen}
        passedLevel={passedLevelRef.current}
        levelSaved={levelSaved}
        onRetrySave={retrySave}
      />
    );
  }

  if (!current) return <NoProblemsScreen user={user} onReset={onReset} />;

  return (
    <Screen>
      <PlayerHeader user={user} onReset={onReset} />
      <h1 className="sr-only">Testing Mode</h1>
      <GameHud level={level} streak={streak} score={score} scoreLabel="Score" />
      <GifSlot />
      <p className="text-center text-body text-ink-dim">Question {index + 1} of {problems.length}</p>
      <DrillBoard current={current} answer={answer} setAnswer={setAnswer} status={status} hint={hint} attemptSummaries={attemptSummaries} submit={submit} />
    </Screen>
  );
}

export default TestingMode;
