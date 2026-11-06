"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Astronaut from '../space/Astronaut';
import { pickLine } from '../../config/brayleeLines';
import { speakCheer } from '../../lib/cheerVoice';
import { buildSteps, nextIndex, introKeyAction, INTRO_SPEECH, REDUCED_SPEECH } from '../../lib/readySetGo';

function stopSpeech() { try { window.speechSynthesis?.cancel(); } catch (_) {} }

// Steps through the timeline with one timeout per step; cleared on unmount.
function useIntroSteps(steps, onDone) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const n = nextIndex(steps, index);
      if (n < 0) onDone(); else setIndex(n);
    }, steps[index].ms);
    return () => clearTimeout(t);
  }, [steps, index, onDone]);
  return index;
}

function useSkipKeys(skip) {
  useEffect(() => {
    const onKey = (e) => {
      const action = introKeyAction(e);
      if (action === 'pass') return;
      e.preventDefault();
      e.stopImmediatePropagation(); // nothing behind the overlay (answer input, Keypad) sees the key
      if (action === 'skip') skip();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [skip]);
}

// Finish-once + skip + one spoken cheer + focus on the Skip button.
function useIntroControls(onDone, reduced) {
  const skipRef = useRef(null);
  const finished = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current();
  }, []);
  const skip = useCallback(() => { stopSpeech(); finish(); }, [finish]);
  useEffect(() => { speakCheer(reduced ? REDUCED_SPEECH : INTRO_SPEECH); }, [reduced]);
  useEffect(() => { skipRef.current?.focus({ preventScroll: true }); }, []);
  useSkipKeys(skip);
  return { skipRef, finish, skip };
}

function Countdown({ step, line, reduced }) {
  const big = step.label !== null;
  const label = big ? step.label : line;
  return (
    <>
      <p role="status" aria-live="assertive" className="sr-only">{big ? label : ''}</p>
      <div aria-hidden="true" className="flex h-32 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={step.key}
            initial={reduced ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className={big ? 'text-glow text-[7rem] font-black leading-none text-neon-amber' : 'text-title font-bold text-ink'}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
    </>
  );
}

/** Full-screen "Ready, set, go" intro. Calls onDone once, when the countdown ends or it is skipped. */
export default function ReadySetGo({ onDone }) {
  const reduced = !!useReducedMotion();
  const steps = buildSteps(reduced);
  const [line] = useState(() => pickLine('session'));
  const { skipRef, finish, skip } = useIntroControls(onDone, reduced);
  const step = steps[useIntroSteps(steps, finish)];
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Get ready"
      onClick={skip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      className="fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center gap-4 bg-space-900/85 px-safe backdrop-blur-sm"
    >
      <motion.div
        initial={reduced ? false : { scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16 }}
      >
        <Astronaut pose={step.pose} size={160} host />
      </motion.div>
      <Countdown step={step} line={line} reduced={reduced} />
      <button
        ref={skipRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); skip(); }}
        className="mt-4 min-h-12 rounded-chunk border-2 border-neon-cyan px-6 text-body font-bold text-ink"
      >
        Skip
      </button>
    </motion.div>
  );
}
