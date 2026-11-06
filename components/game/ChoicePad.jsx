"use client";
import { motion } from 'framer-motion';

const LABEL = { '<': 'less than', '>': 'greater than', '=': 'equal to' };

/** Big answer buttons for choice problems: < > = , yes/no, even/odd, prime/composite. One tap answers. */
export default function ChoicePad({ choices, onPick, disabled = false }) {
  const symbols = choices.every((c) => c.length === 1);
  return (
    <div role="group" aria-label="Pick an answer" className="grid w-full max-w-xs gap-3 sm:max-w-sm" style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}>
      {choices.map((c) => (
        <motion.button
          key={c} type="button" disabled={disabled} whileTap={{ scale: 0.92, y: 2 }} onClick={() => onPick(c)}
          aria-label={LABEL[c] || c}
          className="btn-chunk touch-target flex h-20 items-center justify-center rounded-chunk border border-white/15 bg-space-700 font-bold capitalize text-ink shadow-chunk select-none"
        >
          <span className={symbols ? 'text-[2.75rem] leading-none' : 'text-lead'}>{c}</span>
        </motion.button>
      ))}
    </div>
  );
}
