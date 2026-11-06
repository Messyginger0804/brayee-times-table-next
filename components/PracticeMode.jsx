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
const WRONG_PAUSE_MS = 2000;

function PracticeMode({ user, problems, level, onReset, scoped = false, attemptSummaries = {}, setAttemptSummaries, userProgress = {}, setUserProgress }) {
  const feedback = useFeedback();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState(null); // null | 'correct' | 'wrong'
  const [streak, setStreak] = useState(0);
  const [stars, setStars] = useState(0);
  const [hint, setHint] = useState('');
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [hasShownLevelUnlock, setHasShownLevelUnlock] = useState(false);
  const advanceTimer = useRef(null);

  useEffect(() => {
    feedback.startSession();
    return () => clearTimeout(advanceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = problems[index];

  const submit = () => {
    if (status || !current) return;
    if (answer === '' || !/^\d+$/.test(answer)) { setHint('Tap some numbers first 👆'); return; }
    setHint('');
    const card = current;
    const isCorrect = parseInt(answer, 10) === card.answer;
    setStatus(isCorrect ? 'correct' : 'wrong');

    let nextProgress = userProgress;
    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setStars((s) => s + 1);
      nextProgress = { ...userProgress, [card.id]: true };
      const isNew = !userProgress[card.id];
      const setComplete = isNew && problems.length > 0 && problems.every((p) => nextProgress[p.id]);
      const newBest = recordStreak('practice', nextStreak);
      feedback.correct({ streak: nextStreak, setComplete, newBest });
      if (setUserProgress) setUserProgress(nextProgress);
      if (setComplete) {
        try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
        // Original rule kept: the unlock dialog is for the 25-problem level set
        if (!scoped && !hasShownLevelUnlock && problems.length === 25) {
          setHasShownLevelUnlock(true);
          setTimeout(() => setUnlockOpen(true), CORRECT_PAUSE_MS + 400);
        }
      }
    } else {
      setStreak(0);
      feedback.wrong();
    }

    // Save in the background: never blocks the UI (the attempt route also updates UserProblem.mastered)
    (async () => {
      try { await axios.post(`/api/problems/${card.id}/attempt`, { correct: isCorrect }, { withCredentials: true }); } catch (_) {}
    })();

    // Update the local "last 5" summary
    if (setAttemptSummaries) {
      const key = String(card.id);
      const prev = attemptSummaries[key] || { attempts: [], correctCount: 0, totalCount: 0 };
      const attempts = [{ id: Date.now(), problemId: card.id, isCorrect, createdAt: new Date().toISOString() }, ...(prev.attempts || [])].slice(0, 5);
      setAttemptSummaries({ ...attemptSummaries, [key]: { attempts, correctCount: attempts.filter((a) => a.isCorrect).length, totalCount: attempts.length } });
    }

    advanceTimer.current = setTimeout(() => {
      setAnswer('');
      setStatus(null);
      setIndex((i) => (i + 1) % problems.length);
    }, isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS);
  };

  if (problems.length === 0) {
    return (
      <Screen>
        <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
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
      <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
      <h1 className="sr-only">Practice Mode</h1>
      <GameHud level={level} streak={streak} score={stars} />
      <GifSlot />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:pt-4">
        <QuestionCard id={current.id} problem={current.problem} answer={current.answer} typed={answer} status={status} />
        <AttemptHints problemId={current.id} attemptSummaries={attemptSummaries} hidden={!!status} />
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="min-h-[1.5rem] text-body font-bold text-neon-amber" role="status">{hint}</p>
        <Keypad value={answer} onChange={setAnswer} onSubmit={submit} disabled={!!status} />
      </div>

      <Modal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        title="Congratulations! 🎉🌟"
        actions={<>
          <Button tone="lime" size="lg" onClick={() => { setUnlockOpen(false); onReset(); }}>Start Level 1 Test 🚀</Button>
          <Button tone="ghost" onClick={() => setUnlockOpen(false)}>Continue Practicing ✏️</Button>
        </>}
      >
        <p className="text-lead font-bold text-ink">You have unlocked the Level 1 Test!</p>
        <p>Amazing job completing all 25 problems! 💖 You&apos;re ready for your first official test.</p>
      </Modal>
    </Screen>
  );
}

export default PracticeMode;
