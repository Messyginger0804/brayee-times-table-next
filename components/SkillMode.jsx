"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Header from './Header';
import Screen, { GlassCard } from './ui/Screen';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Keypad from './game/Keypad';
import ChoicePad from './game/ChoicePad';
import QuestionCard from './game/QuestionCard';
import GameHud from './game/GameHud';
import { useFeedback, GifSlot } from './gif/GifProvider';
import { triggerFireworks } from '../lib/fireworks';
import { recordStreak } from '../lib/bestStreak';
import { generateProblem, checkAnswer, createRng } from '../lib/curriculum/math/index.js';

const CORRECT_PAUSE_MS = 900;
const WRONG_PAUSE_MS = 2200;

// Kid-friendly versions of the checker's hints
const KID_HINT = {
  'can you simplify?': 'Right! Can you simplify it?',
  'Right value! Write it in simplest form.': 'Right amount! Can you write it in simplest form?',
  'Check the sign (plus or minus).': 'Look at the plus or minus sign.',
  'Check where the decimal point goes.': 'Check where the decimal point goes.',
  "Don't forget the remainder (R).": "Don't forget the leftover (R).",
  'Your remainder is too big. Keep dividing!': 'The leftover is too big. Can you divide a bit more?',
};
const kidHint = (h) => (h ? KID_HINT[h] || h : '');

export default function SkillMode({ skillId }) {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const feedback = useFeedback();
  const [user, setUser] = useState(null);
  const [skill, setSkill] = useState(undefined); // undefined loading, null not found
  const [levelIndex, setLevelIndex] = useState(0);
  const [prog, setProg] = useState({ have: 0, need: 10 });
  const [problem, setProblem] = useState(null);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState(null);
  const [hint, setHint] = useState('');
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
  const [stars, setStars] = useState(0);
  const [qn, setQn] = useState(0); // question counter: the card animates in only for a new question
  const [modal, setModal] = useState(null); // { kind: 'level' | 'mastered', level }
  const rng = useRef(null);
  const shownAt = useRef(0);
  const timer = useRef(null);
  const busy = useRef(false);
  const levelRef = useRef(0);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      axios.get('/api/auth/me', { withCredentials: true }).then((r) => setUser(r.data || null)).catch(() => setUser(null));
    } else if (authStatus === 'unauthenticated') setUser(null);
  }, [authStatus]);

  useEffect(() => {
    if (!user) return;
    axios.get('/api/curriculum/me', { params: { grade: 'all' }, withCredentials: true })
      .then((r) => {
        const s = (r.data?.skills || []).find((x) => x.id === skillId) || null;
        setSkill(s);
        if (s) {
          levelRef.current = s.levelIndex || 0;
          setLevelIndex(s.levelIndex || 0);
          setProg({ have: s.progress?.levelHave ?? 0, need: s.progress?.levelNeed ?? 10 });
        }
      })
      .catch(() => setSkill(null));
  }, [user, skillId]);

  const next = useCallback((lvl) => {
    if (!rng.current) rng.current = createRng(`${Date.now()}`);
    setProblem(generateProblem(skillId, lvl, rng.current));
    setQn((n) => n + 1);
    setTyped(''); setStatus(null); setHint(''); setNote('');
    shownAt.current = performance.now();
  }, [skillId]);

  useEffect(() => {
    if (skill && skill.source === 'generated' && skill.unlocked) {
      feedback.startSession();
      next(levelRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill?.id]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = async (value) => {
    const given = (value ?? typed).trim();
    if (status || busy.current || !problem) return;
    if (!given) { setNote('Tap some numbers first 👆'); return; }
    busy.current = true;
    setNote('');
    const ms = Math.round(performance.now() - shownAt.current);
    const p = problem;
    const check = checkAnswer(p, given);
    const isCorrect = check.correct;
    setTyped(given);
    setStatus(isCorrect ? 'correct' : 'wrong');
    const h = kidHint(check.feedbackHint);
    setHint(h);
    if (isCorrect) {
      const n = streak + 1;
      setStreak(n); setStars((s) => s + 1);
      feedback.correct({ streak: n, newBest: recordStreak('skill', n) });
    } else {
      setStreak(0);
      feedback.wrong();
    }
    const started = Date.now();
    let data = null;
    try {
      const r = await axios.post('/api/math/attempt', {
        skillId, prompt: p.prompt, expected: p.answer, given, ms,
        answerType: p.answerType, requireSimplest: !!p.requireSimplest, choices: p.keypad?.choices || undefined,
      }, { withCredentials: true });
      data = r.data;
    } catch (_) { /* offline or signed out: keep playing, progress just is not saved */ }
    if (data?.progress) setProg({ have: data.progress.levelHave, need: data.progress.levelNeed });
    let lvl = levelRef.current;
    if (data?.leveledUp) {
      lvl = data.progress.levelIndex;
      levelRef.current = lvl;
      setProg({ have: 0, need: data.progress.levelNeed });
    }
    const wait = Math.max(0, (isCorrect ? CORRECT_PAUSE_MS : h ? WRONG_PAUSE_MS + 800 : WRONG_PAUSE_MS) - (Date.now() - started));
    timer.current = setTimeout(() => {
      busy.current = false;
      if (data?.leveledUp) {
        setLevelIndex(lvl);
        feedback.levelUp();
        setModal({ kind: 'level', level: lvl + 1 });
      } else if (data?.masteredNow) {
        feedback.levelUp();
        try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {}
        setModal({ kind: 'mastered' });
      }
      next(lvl);
    }, wait);
  };

  const closeModal = () => { setModal(null); shownAt.current = performance.now(); };

  const center = (children) => <Screen className="items-center justify-center text-center">{children}</Screen>;

  if (authStatus === 'loading' || (user && skill === undefined)) {
    return center(<p role="status" className="text-title text-neon-cyan">Loading mission… 🚀</p>);
  }
  if (!user) {
    return center(
      <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4">
        <h1 className="text-hero text-neon-pink">Who&apos;s playing? 💖</h1>
        <Button tone="lime" size="lg" href="/login">Go to Login</Button>
      </GlassCard>,
    );
  }
  if (!skill || !skill.unlocked || skill.source !== 'generated') {
    return center(
      <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4">
        <h1 className="text-title text-neon-amber">{skill && !skill.unlocked ? 'This mission is still locked 🔒' : 'Mission not found'}</h1>
        <p className="text-body text-ink-dim">{skill && !skill.unlocked ? 'Finish the mission before it to open this one.' : 'Head back and pick another planet.'}</p>
        <Button tone="cyan" size="lg" onClick={() => router.push('/')}>Back to missions</Button>
      </GlassCard>,
    );
  }

  const k = problem?.keypad;
  const title = skill.name.replace(/\s*\([^)]*\)/g, '');
  const levelName = skill.levelNames?.[levelIndex];
  const pct = Math.min(100, Math.round((prog.have / Math.max(1, prog.need)) * 100));
  const lastLevel = levelIndex >= skill.levelCount - 1;

  return (
    <Screen>
      <Header onReset={() => router.push('/')} userName={user?.name} menuLabel="Missions" />
      <h1 className="sr-only">{skill.name}</h1>
      <GameHud streak={streak} score={stars} />
      <GifSlot />
      <div className="mx-auto w-full max-w-sm px-1 pt-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="truncate font-bold text-neon-amber">{title}</span>
          <span className="shrink-0 text-ink-dim">Level {levelIndex + 1} of {skill.levelCount}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-space-800" role="progressbar" aria-valuemin={0} aria-valuemax={prog.need} aria-valuenow={prog.have}
          aria-label={lastLevel ? 'Progress to mastering this mission' : 'Progress to the next level'}>
          <motion.div className="h-full rounded-full bg-neon-amber" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
        </div>
        {levelName && <p className="mt-0.5 truncate text-xs text-ink-dim">{levelName}</p>}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:pt-2">
        {problem && (
          <QuestionCard id={`q${qn}`} problem={problem.prompt} parts={problem.promptParts}
            answer={problem.answerDisplay} typed={typed} status={status} hint={hint} timeLimit={problem.timeLimit} />
        )}
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="min-h-[1.5rem] text-body font-bold text-neon-amber" role="status">{note}</p>
        {k && (k.digits
          ? <Keypad value={typed} onChange={setTyped} onSubmit={() => submit()} disabled={!!status || !!modal} extras={k} />
          : <ChoicePad choices={k.choices || []} onPick={(c) => submit(c)} disabled={!!status || !!modal} />)}
      </div>

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.kind === 'mastered' ? 'Mission complete! 🏆' : `Level ${modal?.level} unlocked! 🚀`}
        actions={modal?.kind === 'mastered' ? (
          <>
            <Button tone="lime" size="lg" onClick={() => router.push('/')}>Back to missions 🪐</Button>
            <Button tone="ghost" onClick={closeModal}>Keep practicing</Button>
          </>
        ) : (
          <Button tone="lime" size="lg" onClick={closeModal}>Keep going ✨</Button>
        )}
      >
        {modal?.kind === 'mastered'
          ? <p className="text-lead font-bold text-ink">You mastered {title}! 🌟</p>
          : <p className="text-lead font-bold text-ink">Great job! The next problems are a little trickier.</p>}
      </Modal>
    </Screen>
  );
}
