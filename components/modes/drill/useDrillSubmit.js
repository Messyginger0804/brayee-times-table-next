import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { NUMERIC_HINT, addAttempt, isCorrectAnswer, isValidAnswer } from './attempts';

// Starts a feedback session on mount; returns a ref holding the pending timeout (cleared on unmount).
export function useDrillTimer(feedback) {
  const timer = useRef(null);
  useEffect(() => {
    const ref = timer;
    feedback.startSession();
    return () => clearTimeout(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return timer;
}

// Shared submit flow: validate, grade, save in background, update local summaries, then onResult(isCorrect, card).
export function useDrillSubmit({ current, answer, status, setStatus, setHint, attemptSummaries, setAttemptSummaries, onResult }) {
  return () => {
    if (status || !current) return;
    if (!isValidAnswer(answer)) { setHint(NUMERIC_HINT); return; }
    setHint('');
    const isCorrect = isCorrectAnswer(answer, current);
    setStatus(isCorrect ? 'correct' : 'wrong');
    onResult(isCorrect, current);
    // Save in the background: never blocks the UI
    axios.post(`/api/problems/${current.id}/attempt`, { correct: isCorrect }, { withCredentials: true }).catch(() => {});
    if (setAttemptSummaries) setAttemptSummaries(addAttempt(attemptSummaries, current, isCorrect));
  };
}

// Typed answer, grading status ('correct' | 'wrong' | null) and the inline hint text.
export function useDrillInput() {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState(null);
  const [hint, setHint] = useState('');
  return { answer, setAnswer, status, setStatus, hint, setHint };
}
