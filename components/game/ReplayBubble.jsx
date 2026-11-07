"use client";
import { motion } from 'framer-motion';
import { replayCheer } from '../../lib/cheerVoice';

/**
 * A speech bubble you can tap to hear Braylee say its text again (lib/cheerVoice replayCheer: respects mute,
 * never talks over spelling speech). A real button, so Enter / Space work; at least 44x44 px. Children (e.g. the tail)
 * render before the text. The text itself is announced by the caller's live region, so the button is not a live region (no double announce). The label starts with the visible text (WCAG 2.5.3).
 */
export default function ReplayBubble({ text, className = '', children, ...motionProps }) {
  return (
    <motion.button
      type="button"
      aria-label={`${text}. Hear Braylee say it again`}
      onClick={(e) => { e.stopPropagation(); replayCheer(text); }}
      className={`pointer-events-auto min-h-[44px] min-w-[44px] cursor-pointer rounded-chunk border-2 border-neon-cyan bg-ink text-body font-bold text-space-950 shadow-glow-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan active:brightness-90 motion-reduce:transition-none ${className}`}
      {...motionProps}
    >
      {children}
      {text}
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" className="ml-1.5 inline-block align-[-2px] opacity-60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    </motion.button>
  );
}
