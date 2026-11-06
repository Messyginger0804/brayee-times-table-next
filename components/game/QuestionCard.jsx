"use client";
import { AnimatePresence, motion } from 'framer-motion';
import PromptParts, { hasBlank } from './PromptParts';

const prettyProblem = (p) => String(p).replace(/\s*x\s*/i, ' × ');

/**
 * The question. Enters from the right, exits to the left. `status` is null | 'correct' | 'wrong':
 * correct pops with a lime glow, wrong does a gentle shake (never harsh) and reveals the answer.
 */
export default function QuestionCard({ id, problem, answer, typed, status, parts = null, hint = '', timeLimit = null }) {
  const rich = Array.isArray(parts);
  const inline = rich && hasBlank(parts);
  const border = status === 'correct' ? 'border-neon-lime shadow-glow-lime'
    : status === 'wrong' ? 'border-neon-coral shadow-glow-coral'
    : 'border-neon-cyan/60 shadow-glow-cyan';

  return (
    <div className="relative w-full max-w-sm" style={{ minHeight: rich ? '9.5rem' : '11rem' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          initial={{ x: 60, opacity: 0, scale: 0.95 }}
          animate={
            status === 'correct' ? { x: 0, opacity: 1, scale: [1, 1.08, 1] }
            : status === 'wrong' ? { x: [0, -8, 8, -5, 5, 0], opacity: 1, scale: 1 }
            : { x: 0, opacity: 1, scale: 1 }
          }
          exit={{ x: -60, opacity: 0, scale: 0.95 }}
          transition={status ? { duration: 0.5 } : { type: 'spring', stiffness: 300, damping: 26 }}
          className={`glass flex flex-col items-center justify-center rounded-bubble border-2 bg-space-800/70 px-4 ${rich ? 'py-4' : 'py-6'} text-center ${border}`}
        >
          {rich ? (
            <div className={(problem || '').length > 18 ? 'text-[1.75rem] leading-tight' : 'text-[2.5rem] leading-tight'}>
              <PromptParts parts={parts} typed={typed} status={status} />
            </div>
          ) : (
            <p className="text-jumbo text-ink" aria-label={`Question: ${prettyProblem(problem)}`}>{prettyProblem(problem)}</p>
          )}
          {timeLimit ? <p className="mt-1 text-sm text-ink-dim"><span aria-hidden="true">⏱</span> Try for {timeLimit} seconds</p> : null}
          <p className={`mt-3 items-center gap-3 text-number ${inline ? 'sr-only' : 'flex'}`} aria-live="polite">
            <span aria-hidden="true" className="text-ink-dim">=</span>
            <span
              className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-chunk border-2 px-3 py-1 ${
                status === 'correct' ? 'border-neon-lime text-neon-lime'
                : status === 'wrong' ? 'border-neon-coral text-neon-coral'
                : 'border-dashed border-white/30 text-neon-amber'}`}
              aria-label={typed ? `Your answer: ${typed}` : 'Your answer: empty'}
            >
              {typed || <span className="opacity-40">?</span>}
            </span>
          </p>
          <div className="mt-2 min-h-[2rem] text-lead font-bold" aria-live="polite">
            {status === 'wrong' && <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-neon-amber">The answer is {answer}</motion.span>}
            {status === 'correct' && <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-neon-lime">Correct! ⭐</motion.span>}
            {status && hint ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 block text-body font-bold text-ink">{hint}</motion.span> : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
