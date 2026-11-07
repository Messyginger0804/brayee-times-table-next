"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { triggerFireworks } from '../../../lib/fireworks';
import { gameFx } from '../../../lib/gameFx';
import { recordStreak } from '../../../lib/bestStreak';
import { generateProblem, checkAnswer, createRng } from '../../../lib/curriculum/math/index.js';
import { startAfterIntro } from '../../../lib/readySetGo';
import { kidHint, pauseMs, buildAttemptPayload, resolveProgress, celebrationFor } from './skillLogic';

const ATTEMPT_TIMEOUT_MS = 8000;

/** Aborts a hung request so the game never freezes. The attempt is not retried, so it cannot be recorded twice. */
async function postAttempt(payload) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const r = await axios.post('/api/math/attempt', payload, { withCredentials: true, signal: ctl.signal });
    return r.data;
  } catch (_) { return null; /* offline, timed out or signed out: keep playing, progress just is not saved */ } finally { clearTimeout(t); }
}

function celebrate(c, lvl, { setLevelIndex, setModal, feedback }) {
  if (!c) return;
  if (c.kind === 'level') setLevelIndex(lvl);
  feedback.levelUp({ modal: true });
  if (c.kind === 'mastered') { gameFx.emit('mastered'); try { triggerFireworks({ duration: 2200, particles: 260 }); } catch (_) {} }
  setModal(c);
}

function useSkillScore(feedback) {
  const [streak, setStreak] = useState(0);
  const [stars, setStars] = useState(0);
  const recordResult = (isCorrect) => {
    if (!isCorrect) { setStreak(0); feedback.wrong(); return; }
    const n = streak + 1;
    setStreak(n); setStars((s) => s + 1);
    feedback.correct({ streak: n, newBest: recordStreak('skill', n) });
  };
  return { streak, stars, recordResult };
}

/** Question / answer loop for a generated skill. */
export function useSkillGame({ skillId, skill, feedback, levelRef, setProg, setLevelIndex }) {
  const [problem, setProblem] = useState(null);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState(null);
  const [hint, setHint] = useState('');
  const [note, setNote] = useState('');
  const { streak, stars, recordResult } = useSkillScore(feedback);
  const [qn, setQn] = useState(0); // question counter: the card animates in only for a new question
  const [modal, setModal] = useState(null); // { kind: 'level' | 'mastered', level }
  const rng = useRef(null);
  const shownAt = useRef(0);
  const timer = useRef(null);
  const busy = useRef(false);

  const next = useCallback((lvl) => {
    if (!rng.current) rng.current = createRng(`${Date.now()}`);
    setProblem(generateProblem(skillId, lvl, rng.current));
    setQn((n) => n + 1);
    setTyped(''); setStatus(null); setHint(''); setNote('');
    shownAt.current = performance.now();
  }, [skillId]);

  useEffect(() => {
    if (skill && skill.source === 'generated' && skill.unlocked) {
      // First problem (and its response-time clock) starts only after the Ready-set-go intro
      return startAfterIntro(() => feedback.startSession({ intro: true }), () => next(levelRef.current));
    }
    return undefined;
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
    const check = checkAnswer(problem, given);
    const h = kidHint(check.feedbackHint);
    setTyped(given);
    setStatus(check.correct ? 'correct' : 'wrong');
    setHint(h);
    recordResult(check.correct);
    const started = Date.now();
    const data = await postAttempt(buildAttemptPayload(skillId, problem, given, ms));
    const { level, prog } = resolveProgress(data, levelRef.current);
    if (!data?.leveledUp && level !== levelRef.current) setLevelIndex(level);
    levelRef.current = level;
    if (prog) setProg(prog);
    const wait = Math.max(0, pauseMs(check.correct, !!h) - (Date.now() - started));
    timer.current = setTimeout(() => {
      busy.current = false;
      celebrate(celebrationFor(data, level), level, { setLevelIndex, setModal, feedback });
      next(level);
      if (!data) setNote("Couldn't save that one, but keep going! 🚀");
    }, wait);
  };

  const closeModal = () => { setModal(null); shownAt.current = performance.now(); };

  return { problem, qn, typed, setTyped, status, hint, note, streak, stars, modal, submit, closeModal };
}
