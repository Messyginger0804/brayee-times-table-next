"use client";
import { useEffect, useRef, useState } from 'react';
import { recordStreak } from '../../../lib/bestStreak';
import { startAfterIntro } from '../../../lib/readySetGo';
import { speakWord, isCorrectSpelling, spellingPauseMs, pickRandom } from './spellingLogic';

/** One word at a time: pick, speak, check, score. */
export function useSpellingRound({ wordsRef, feedback }) {
  const [currentWordData, setCurrentWordData] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null); // null | { correct, word }
  const [hint, setHint] = useState('');
  const [streak, setStreak] = useState(0);
  const [stars, setStars] = useState(0);
  const timer = useRef(null);
  const inputRef = useRef(null);

  const cancelIntro = useRef(null);

  useEffect(() => () => { cancelIntro.current?.(); clearTimeout(timer.current); try { window.speechSynthesis?.cancel(); } catch (_) {} }, []);

  const startRound = () => {
    const list = wordsRef.current;
    if (!list.length) return;
    const data = pickRandom(list);
    setCurrentWordData(data);
    setResult(null);
    setUserAnswer('');
    setHint('');
    speakWord(`Spell: ${data.word}`);
    // keep the keyboard flow smooth on desktop; on phones the child taps the field when ready
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
  };

  // "Start Round": Ready-set-go first, then the first word is spoken and the field focused.
  const beginRound = () => {
    if (cancelIntro.current || !wordsRef.current.length) return;
    cancelIntro.current = startAfterIntro(feedback.playIntro, () => { cancelIntro.current = null; startRound(); });
  };

  const score = (isCorrect) => {
    if (!isCorrect) { setStreak(0); feedback.wrong({ moment: 'spellingWrong' }); return; }
    const next = streak + 1;
    setStreak(next);
    setStars((s) => s + 1);
    feedback.correct({ streak: next, newBest: recordStreak('spelling', next), moment: 'spellingCorrect' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (result || !currentWordData) return;
    if (!userAnswer.trim()) { setHint('Type your spelling first ✏️'); return; }
    setHint('');
    const isCorrect = isCorrectSpelling(userAnswer, currentWordData.word);
    setResult({ correct: isCorrect, word: currentWordData.word });
    score(isCorrect);
    timer.current = setTimeout(startRound, spellingPauseMs(isCorrect));
  };

  const changeWords = () => { clearTimeout(timer.current); setCurrentWordData(null); setResult(null); };

  return { currentWordData, userAnswer, setUserAnswer, result, hint, streak, stars, inputRef, startRound: beginRound, handleSubmit, changeWords };
}
