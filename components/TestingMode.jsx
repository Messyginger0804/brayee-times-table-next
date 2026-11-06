"use client";
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Header from './Header';
import Screen, { GlassCard } from './ui/Screen';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Keypad from './game/Keypad';
import QuestionCard from './game/QuestionCard';
import GameHud from './game/GameHud';
import AttemptHints from './game/AttemptHints';
import { useFeedback, GifSlot } from './gif/GifProvider';
import { triggerFireworks } from '../lib/fireworks';
import { recordStreak } from '../lib/bestStreak';

const CORRECT_PAUSE_MS = 900;
const WRONG_PAUSE_MS = 2200;

function TestingMode({ user, problems, level, onLevelUp, onReset, attemptSummaries = {}, setAttemptSummaries }) {
  const feedback = useFeedback();
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState(null);
  const [streak, setStreak] = useState(0);
  const [hint, setHint] = useState('');
  const [passed, setPassed] = useState(false); // finished every question
  const [passOpen, setPassOpen] = useState(false);
  const timer = useRef(null);
  const passedLevelRef = useRef(level);

  useEffect(() => {
    feedback.startSession();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restartGame = () => {
    setIndex(0); setScore(0); setGameOver(false); setPassed(false); setAnswer(''); setStatus(null); setStreak(0);
    feedback.startSession({ withGif: false });
  };

  const current = problems[index];

  const submit = () => {
    if (status || !current) return;
    if (answer === '' || !/^\d+$/.test(answer)) { setHint('Tap some numbers first 👆'); return; }
    setHint('');
    const card = current;
    const isCorrect = parseInt(answer, 10) === card.answer;
    const isLast = index === problems.length - 1;
    setStatus(isCorrect ? 'correct' : 'wrong');

    // Save attempt in the background (same endpoint as before)
    axios.post(`/api/problems/${card.id}/attempt`, { correct: isCorrect }, { withCredentials: true }).catch(() => {});

    if (setAttemptSummaries) {
      const key = String(card.id);
      const prev = attemptSummaries[key] || { attempts: [], correctCount: 0, totalCount: 0 };
      const attempts = [{ id: Date.now(), problemId: card.id, isCorrect, createdAt: new Date().toISOString() }, ...(prev.attempts || [])].slice(0, 5);
      setAttemptSummaries({ ...attemptSummaries, [key]: { attempts, correctCount: attempts.filter((a) => a.isCorrect).length, totalCount: attempts.length } });
    }

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setScore((s) => s + 1);
      feedback.correct({ streak: nextStreak, setComplete: isLast, newBest: !isLast && recordStreak('testing', nextStreak) });
      if (isLast) {
        try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
        timer.current = setTimeout(async () => {
          // Level 1 pass: save the new level, but stay here so the celebration can show
          passedLevelRef.current = level;
          if (level === 1) { try { await onLevelUp({ stay: true }); } catch (_) {} }
          setPassed(true); setGameOver(true); setStatus(null); setAnswer('');
          setPassOpen(true);
        }, CORRECT_PAUSE_MS);
      } else {
        timer.current = setTimeout(() => { setAnswer(''); setStatus(null); setIndex((i) => i + 1); }, CORRECT_PAUSE_MS);
      }
    } else {
      setStreak(0);
      feedback.wrong();
      timer.current = setTimeout(() => { setGameOver(true); setStatus(null); setAnswer(''); }, WRONG_PAUSE_MS);
    }
  };

  const header = <Header onReset={onReset} userName={user?.name} userImage={user?.image} />;

  if (gameOver) {
    return (
      <Screen>
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div aria-hidden="true" className="text-jumbo">{passed ? '🏆' : '🌠'}</div>
          <h1 className="text-hero text-neon-pink">{passed ? 'Mission Complete!' : 'Game Over'}</h1>
          <p className="text-lead">Your final score is <strong className="text-neon-lime">{score}</strong></p>
          <Button tone="pink" size="lg" onClick={restartGame}>Try Again 🔁</Button>
          <Button tone="ghost" onClick={onReset}>Back to Main Menu</Button>
        </div>
        <Modal
          open={passOpen}
          onClose={() => setPassOpen(false)}
          title={passedLevelRef.current === 1 ? 'You passed Level 1! 🎉' : 'Perfect score! 🎉'}
          actions={<Button tone="lime" size="lg" onClick={() => setPassOpen(false)}>Awesome! ✨</Button>}
        >
          <p>{passedLevelRef.current === 1 ? 'Level 2 is unlocked. Great job, space cadet! 💖' : 'Every answer was right. Amazing! 💖'}</p>
        </Modal>
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen>
        {header}
        <div className="flex flex-1 items-center justify-center">
          <GlassCard className="text-center">
            <h1 className="mb-2 text-title text-neon-pink">No Problems Yet</h1>
            <p className="mb-5 text-body text-ink-dim">There aren&apos;t any problems available for this level right now.</p>
            <Button tone="violet" onClick={onReset}>Back to Main Menu</Button>
          </GlassCard>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <h1 className="sr-only">Testing Mode</h1>
      <GameHud level={level} streak={streak} score={score} scoreLabel="Score" />
      <GifSlot />
      <p className="text-center text-body text-ink-dim">Question {index + 1} of {problems.length}</p>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:pt-4">
        <QuestionCard id={current.id} problem={current.problem} answer={current.answer} typed={answer} status={status} />
        <AttemptHints problemId={current.id} attemptSummaries={attemptSummaries} hidden={!!status} />
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="min-h-[1.5rem] text-body font-bold text-neon-amber" role="status">{hint}</p>
        <Keypad value={answer} onChange={setAnswer} onSubmit={submit} disabled={!!status} />
      </div>
    </Screen>
  );
}

export default TestingMode;
