"use client";
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Astronaut from './space/Astronaut';
import Button from './ui/Button';
import { triggerFireworks } from '../lib/fireworks';
import { useScenePopup } from '../lib/sceneFx';
import { useMomentClaim } from '../lib/momentDirector';
import { cadetWelcomeTitle, takeCadetWelcome } from '../lib/cadetWelcome';

const SUBTEXT = "That's your cadet number on this device. Come back on this device anytime to keep your progress.";

/** One-time popup for guests right after they claim or resume a seat (queued by the login hook). */
export function useCadetWelcome() {
  const [welcome, setWelcome] = useState(null);
  useEffect(() => {
    const w = takeCadetWelcome(window.sessionStorage);
    if (w) setWelcome(w);
  }, []);
  return [welcome, () => setWelcome(null)];
}

/** Landing overlay queue: while this is open nothing else (grade picker, menu, bubbles) is shown. */
export default function CadetWelcome({ welcome, onClose: close }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  useScenePopup(!!welcome);
  useMomentClaim('modal', !!welcome);
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!welcome) return undefined;
    if (!reduce) { try { triggerFireworks({ duration: 1400, particles: 60 }); } catch (_) {} }
    const prev = document.activeElement;
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = ref.current?.querySelectorAll('button, a[href]');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [welcome, reduce]);

  return (
    <AnimatePresence>
      {welcome && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/70 p-4 pb-safe"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}
        >
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-labelledby="cadet-welcome-title" aria-describedby="cadet-welcome-desc"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { y: 40, scale: 0.92, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="glass flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col items-center gap-3 overflow-y-auto rounded-bubble bg-space-800/95 p-6 text-center shadow-glow-violet"
          >
            <Astronaut pose={reduce ? 'idle' : 'welcome'} size={110} />
            <h2 id="cadet-welcome-title" className="text-title text-neon-amber">{cadetWelcomeTitle(welcome)}</h2>
            <p id="cadet-welcome-desc" className="text-body text-ink-dim">{SUBTEXT}</p>
            <Button tone="lime" size="lg" onClick={close} className="mt-1 w-full">Let&apos;s go!</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
