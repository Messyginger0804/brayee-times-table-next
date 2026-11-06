"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './Header';
import Screen, { GlassCard } from './ui/Screen';
import Button from './ui/Button';
import GameHud from './game/GameHud';
import { useFeedback, GifSlot } from './gif/GifProvider';
import { recordStreak } from '../lib/bestStreak';
import { unitsFor, kidTitle, TIERS } from '../lib/spellingUnits';

const CORRECT_PAUSE_MS = 1400;
const WRONG_PAUSE_MS = 2600;

const gradeLabel = (g) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[g] || `${g}th`);

/** Grade / kind of words / spelling pattern. Only for kids with a grade; others keep the one-button start. */
function WordPicker({ pick, setPick, count }) {
  const units = pick.tier === 'core' ? unitsFor(pick.grade, 'core') : [];
  const unit = units.find((u) => u.id === pick.unit);
  const chip = (on) => `min-h-12 rounded-chunk px-3 text-body font-bold border ${on ? 'border-neon-amber bg-neon-amber text-space-950' : 'border-white/20 bg-space-800/80 text-ink'}`;
  return (
    <GlassCard className="w-full max-w-md space-y-3">
      <fieldset>
        <legend className="mb-2 text-lead font-bold text-neon-cyan">Grade</legend>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <button key={g} type="button" aria-pressed={pick.grade === g} aria-label={`${gradeLabel(g)} grade`} className={chip(pick.grade === g)}
              onClick={() => setPick({ grade: g, tier: pick.tier, unit: '' })}>{g}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-lead font-bold text-neon-cyan">Words</legend>
        <div className="grid grid-cols-2 gap-2">
          {TIERS.map((t) => (
            <button key={t.id || 'all'} type="button" aria-pressed={pick.tier === t.id} className={chip(pick.tier === t.id)}
              onClick={() => setPick({ ...pick, tier: t.id, unit: '' })}><span aria-hidden="true">{t.emoji}</span> {t.label}</button>
          ))}
        </div>
      </fieldset>
      {units.length > 0 && (
        <div>
          <label htmlFor="unit" className="mb-2 block text-lead font-bold text-neon-cyan">Spelling pattern</label>
          <select id="unit" value={pick.unit} onChange={(e) => setPick({ ...pick, unit: e.target.value })}
            className="min-h-12 w-full rounded-chunk border-2 border-white/25 bg-space-900/80 px-3 text-body text-ink focus:border-neon-cyan focus:outline-none">
            <option value="">All patterns</option>
            {units.map((u) => <option key={u.id} value={u.id}>{kidTitle(u)}</option>)}
          </select>
          {unit && <p className="mt-2 line-clamp-4 text-sm text-ink-dim">{unit.rule}</p>}
        </div>
      )}
      <p role="status" className="text-center text-body text-ink-dim">{count == null ? 'Finding words…' : `${count} word${count === 1 ? '' : 's'} ready`}</p>
    </GlassCard>
  );
}

function SpellingBeeMode() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const feedback = useFeedback();
  const [user, setUser] = useState(null);
  const loading = authStatus === 'loading';

  const [currentWordData, setCurrentWordData] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null); // null | { correct, word }
  const [hint, setHint] = useState('');
  const [streak, setStreak] = useState(0);
  const [stars, setStars] = useState(0);
  const [wordsReady, setWordsReady] = useState(false);
  const [myGrade, setMyGrade] = useState(null); // the kid's own grade (null = no grade set: no picker, old behaviour)
  const [pick, setPick] = useState({ grade: null, tier: '', unit: '' });
  const [picking, setPicking] = useState(true);
  const wordsRef = useRef([]);
  const firstLoad = useRef(true);
  const skipNext = useRef(false);
  const timer = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      axios.get('/api/auth/me', { withCredentials: true })
        .then((r) => setUser(r.data || null))
        .catch(() => setUser(null));
    } else if (authStatus === 'unauthenticated') {
      setUser(null);
    }
  }, [authStatus]);

  useEffect(() => {
    if (user) feedback.startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]);

  // Words come from the DB via the API (the API falls back to lib/spellingWords.json when the table is empty).
  // First load: no params, so a kid with a grade gets their grade and a kid without one gets every word, as before.
  // After that the picker (grade / tier / unit) drives explicit queries.
  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return undefined; } // the pick.grade set by the first load itself
    let alive = true;
    const params = {};
    if (!firstLoad.current && pick.grade) {
      params.grade = pick.grade;
      if (pick.tier) params.tier = pick.tier;
      if (pick.unit) params.unit = pick.unit;
    }
    setWordsReady(false);
    axios.get('/api/spelling/words', { params })
      .then((r) => ({ words: Array.isArray(r.data?.words) ? r.data.words : [], grade: Number.isInteger(r.data?.grade) ? r.data.grade : null }))
      .catch(() => import('../lib/spellingWords.json').then((m) => ({ words: m.default, grade: null })))
      .then(({ words, grade }) => {
        if (!alive) return;
        wordsRef.current = words || [];
        if (firstLoad.current) {
          firstLoad.current = false;
          setMyGrade(grade);
          if (grade) { skipNext.current = true; setPick((p) => ({ ...p, grade })); }
        }
        setWordsReady(true);
      });
    return () => { alive = false; };
  }, [pick.grade, pick.tier, pick.unit]);

  useEffect(() => () => { clearTimeout(timer.current); try { window.speechSynthesis?.cancel(); } catch (_) {} }, []);

  if (loading) {
    return (
      <Screen className="items-center justify-center text-center">
        <p role="status" className="text-title text-neon-amber">Loading… 🐝</p>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen className="items-center justify-center">
        <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-hero text-neon-amber">Who&apos;s playing? 💖</h1>
          <p className="text-body text-ink-dim">Please sign in to start the Spelling Bee.</p>
          <Button tone="lime" size="lg" href="/login">Go to Login</Button>
        </GlassCard>
      </Screen>
    );
  }

  const speakWord = (text) => {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  const getHiddenSentence = (sentence, word) => {
    if (!sentence || !word) return '';
    return sentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), '_____');
  };

  const startRound = () => {
    const list = wordsRef.current;
    if (!list.length) return;
    const data = list[Math.floor(Math.random() * list.length)];
    setCurrentWordData(data);
    setResult(null);
    setUserAnswer('');
    setHint('');
    speakWord(`Spell: ${data.word}`);
    // keep the keyboard flow smooth on desktop; on phones the child taps the field when ready
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (result || !currentWordData) return;
    if (!userAnswer.trim()) { setHint('Type your spelling first ✏️'); return; }
    setHint('');
    const isCorrect = userAnswer.trim().toLowerCase() === currentWordData.word.toLowerCase();
    setResult({ correct: isCorrect, word: currentWordData.word });
    if (isCorrect) {
      const next = streak + 1;
      setStreak(next);
      setStars((s) => s + 1);
      feedback.correct({ streak: next, newBest: recordStreak('spelling', next) });
    } else {
      setStreak(0);
      feedback.wrong();
    }
    timer.current = setTimeout(startRound, isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS);
  };

  const field = 'w-full min-h-[3.5rem] rounded-chunk border-2 bg-space-900/80 px-4 text-center text-title text-ink placeholder:text-ink-dim/70 focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';
  const fieldTone = !result ? 'border-white/25 focus:border-neon-cyan' : result.correct ? 'border-neon-lime' : 'border-neon-coral';

  return (
    <Screen>
      <Header onReset={() => router.push('/')} userName={user?.name} userImage={user?.image} />
      <h1 className="text-center text-title text-neon-amber text-glow">Spelling Bee 🐝</h1>
      <GameHud streak={streak} score={stars} />
      <GifSlot />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:pt-4">
        {!currentWordData ? (
          <>
            {myGrade && <WordPicker pick={pick} setPick={setPick} count={wordsReady ? wordsRef.current.length : null} />}
            <Button tone="amber" size="lg" onClick={startRound} disabled={!wordsReady || !wordsRef.current.length} className={`w-full max-w-xs text-title ${myGrade ? 'sticky bottom-3 z-30' : ''}`}>Start Round ▶️🎤</Button>
            {wordsReady && !wordsRef.current.length && <p role="status" className="text-body text-neon-amber">No words here yet. Try another pick!</p>}
          </>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentWordData.word}
              initial={{ x: 60, opacity: 0 }}
              animate={result && !result.correct ? { x: [0, -8, 8, -5, 5, 0], opacity: 1 } : { x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md"
            >
              <GlassCard className="mb-4 space-y-2 text-left">
                <p><span className="font-bold text-neon-cyan">Part of speech:</span> {currentWordData.partOfSpeech}</p>
                <p><span className="font-bold text-neon-cyan">Definition:</span> {currentWordData.definition}</p>
                <p>
                  <span className="font-bold text-neon-cyan">Sentence:</span>{' '}
                  {getHiddenSentence(currentWordData.sentence, currentWordData.word)}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button tone="cyan" size="sm" onClick={() => speakWord(`Spell: ${currentWordData.word}`)}>🔊 Hear word</Button>
                  <Button tone="violet" size="sm" onClick={() => speakWord(currentWordData.sentence)}>🔊 Hear sentence</Button>
                </div>
              </GlassCard>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                <label htmlFor="spelling" className="sr-only">Type your spelling</label>
                <input
                  id="spelling" ref={inputRef} type="text" value={userAnswer} disabled={!!result}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your spelling here"
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done"
                  className={`${field} ${fieldTone}`}
                />
                <p className="min-h-[1.75rem] text-center text-lead font-bold" role="status">
                  {hint && <span className="text-neon-amber">{hint}</span>}
                  {result?.correct && <span className="text-neon-lime">Correct! ⭐</span>}
                  {result && !result.correct && <span className="text-neon-amber">The word was <strong>{result.word}</strong>. You got this! 💪</span>}
                </p>
                <Button type="submit" tone="lime" size="lg" disabled={!!result} className="w-full">Submit Spelling ✓</Button>
              </form>
              {myGrade && (
                <Button tone="ghost" size="sm" className="mt-3 w-full" onClick={() => { clearTimeout(timer.current); setCurrentWordData(null); setResult(null); }}>
                  <span aria-hidden="true">⚙️</span> Change words
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Screen>
  );
}

export default SpellingBeeMode;
