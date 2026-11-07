"use client";
import { AnimatePresence, motion } from 'framer-motion';
import PromptParts, { hasBlank } from './PromptParts';

const prettyProblem = (p) => String(p).replace(/\s*x\s*/i, ' × ');

const statusKey = (status) => status || 'idle';

const BORDER = {
  correct: 'border-neon-lime shadow-glow-lime',
  wrong: 'border-neon-coral shadow-glow-coral',
  idle: 'border-neon-cyan/60 shadow-glow-cyan',
};
const ANIMATE = {
  correct: { x: 0, opacity: 1, scale: [1, 1.08, 1] },
  wrong: { x: [0, -8, 8, -5, 5, 0], opacity: 1, scale: 1 },
  idle: { x: 0, opacity: 1, scale: 1 },
};
const ANSWER_CLS = {
  correct: 'border-neon-lime text-neon-lime',
  wrong: 'border-neon-coral text-neon-coral',
  idle: 'border-dashed border-white/30 text-neon-amber',
};
const TRANSITION_STATUS = { duration: 0.5 };
const TRANSITION_IDLE = { type: 'spring', stiffness: 300, damping: 26 };

function Prompt({ rich, parts, problem, typed, status }) {
  if (!rich) {
    return <p className="text-jumbo text-ink">{prettyProblem(problem)}</p>;
  }
  return (
    <div className={(problem || '').length > 18 ? 'text-[1.75rem] leading-tight' : 'text-[2.5rem] leading-tight'}>
      <PromptParts parts={parts} typed={typed} status={status} />
    </div>
  );
}

function AnswerBox({ typed, status, inline }) {
  return (
    <p className={`mt-3 items-center gap-3 text-number ${inline ? 'sr-only' : 'flex'}`} aria-live="polite">
      <span aria-hidden="true" className="text-ink-dim">=</span>
      <span
        className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-chunk border-2 px-3 py-1 ${ANSWER_CLS[statusKey(status)]}`}
        aria-label={typed ? `Your answer: ${typed}` : 'Your answer: empty'}
      >
        {typed || <span className="opacity-40">?</span>}
      </span>
    </p>
  );
}

function Feedback({ status, answer, hint }) {
  return (
    <div className="mt-2 min-h-[2rem] text-lead font-bold" aria-live="polite">
      {status === 'wrong' && <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-neon-amber">The answer is {answer}</motion.span>}
      {status === 'correct' && <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-neon-lime">Correct! ⭐</motion.span>}
      {status && hint ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 block text-body font-bold text-ink">{hint}</motion.span> : null}
    </div>
  );
}

/**
 * The question. Enters from the right, exits to the left. `status` is null | 'correct' | 'wrong':
 * correct pops with a lime glow, wrong does a gentle shake (never harsh) and reveals the answer.
 */
export default function QuestionCard({ id, problem, answer, typed, status, parts = null, hint = '', timeLimit = null }) {
  const rich = Array.isArray(parts);
  const inline = rich && hasBlank(parts);
  const key = statusKey(status);

  return (
    <div className="relative w-full max-w-sm" style={{ minHeight: rich ? '9.5rem' : '11rem' }}>
      <p className="sr-only" role="status" aria-live="polite" data-testid="question-announce">{`Question: ${prettyProblem(problem)}`}</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          initial={{ x: 60, opacity: 0, scale: 0.95 }}
          animate={ANIMATE[key]}
          exit={{ x: -60, opacity: 0, scale: 0.95 }}
          transition={status ? TRANSITION_STATUS : TRANSITION_IDLE}
          className={`glass flex flex-col items-center justify-center rounded-bubble border-2 bg-space-800/70 px-4 ${rich ? 'py-4' : 'py-6'} text-center ${BORDER[key]}`}
        >
          <Prompt rich={rich} parts={parts} problem={problem} typed={typed} status={status} />
          {timeLimit ? <p className="mt-1 text-sm text-ink-dim"><span aria-hidden="true">⏱</span> Try for {timeLimit} seconds</p> : null}
          <AnswerBox typed={typed} status={status} inline={inline} />
          <Feedback status={status} answer={answer} hint={hint} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
