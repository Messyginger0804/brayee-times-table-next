"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { emoji } from '../../lib/emoji';

function statsLine(show, last5) {
  if (!show || last5.correctCount <= 0) return null;
  return `You have answered this right ${last5.correctCount} out of the last ${Math.min(5, last5.totalCount || 0)} times. ${emoji.heart()}`;
}

const ENCOURAGE = {
  true: () => `You answered this right last time, you got this! ✅ ${emoji.party()}`,
  false: () => `Last time was tricky, you got this! ${emoji.encourage()}`,
};

function encourageLine(show, last5, lastCorrect) {
  if (!show || last5.totalCount <= 0 || lastCorrect === null) return null;
  return ENCOURAGE[String(lastCorrect)]();
}

function summarize(d) {
  const attempts = Array.isArray(d.attempts) ? d.attempts : [];
  return {
    last5: { correctCount: d.correctCount || 0, totalCount: d.totalCount || (d.attempts?.length || 0) },
    lastCorrect: attempts.length > 0 ? !!attempts[0].isCorrect : null,
  };
}

/**
 * Past-performance hints for the current problem ("right 3 of the last 5", "last time was tricky").
 * Same data/endpoint as before: cached attemptSummaries first, then GET /api/problems/:id/last5.
 * Appears after a short delay so it does not distract from reading the question.
 */
export default function AttemptHints({ problemId, attemptSummaries = {}, hidden = false }) {
  const [last5, setLast5] = useState({ correctCount: 0, totalCount: 0 });
  const [lastCorrect, setLastCorrect] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showEncourage, setShowEncourage] = useState(false);
  const summary = attemptSummaries[String(problemId)];

  useEffect(() => {
    let cancelled = false;
    const apply = (d) => {
      if (cancelled) return;
      const next = summarize(d);
      setLast5(next.last5);
      setLastCorrect(next.lastCorrect);
    };
    if (summary) apply(summary);
    else {
      axios.get(`/api/problems/${problemId}/last5`, { withCredentials: true })
        .then((r) => apply(r.data))
        .catch(() => apply({}));
    }
    return () => { cancelled = true; };
  }, [problemId, summary]);

  useEffect(() => {
    setShowStats(false);
    setShowEncourage(false);
    const a = setTimeout(() => setShowStats(true), 1500);
    const b = setTimeout(() => setShowEncourage(true), 3500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [problemId]);

  const line1 = statsLine(showStats, last5);
  const line2 = encourageLine(showEncourage, last5, lastCorrect);

  return (
    <div className="min-h-[2.75rem] w-full max-w-sm text-center text-body text-ink-dim" aria-live="polite">
      <AnimatePresence>
        {!hidden && line1 && <motion.p key="l1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{line1}</motion.p>}
        {!hidden && line2 && <motion.p key="l2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{line2}</motion.p>}
      </AnimatePresence>
    </div>
  );
}
