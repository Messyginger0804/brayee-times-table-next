"use client";
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Astronaut, { POSE_MS } from '../space/Astronaut';

export const HOST_ALT = "Braylee, the app's host";
export const HOST_WELCOME = 'Hey! Welcome to my learning app! I use this to be sooo smart! 🚀✨';
export const HOST_LINES = ['Pick a mission, Cadet!', "You're gonna be sooo smart too!", 'Ready when you are, Cadet! 🚀'];

/** Speech bubble in a polite live region. `tail`: where the pointer sits ('top' | 'left'). */
export function SpeechBubble({ text, tail = 'top', className = '' }) {
  const reduce = useReducedMotion();
  const tailCls = tail === 'left'
    ? '-left-[7px] top-1/2 -translate-y-1/2 border-b-2 border-l-2'
    : '-top-[7px] left-1/2 -translate-x-1/2 border-l-2 border-t-2';
  return (
    <div aria-live="polite" role="status" className={className}>
      {text ? (
        <motion.p
          key={text}
          initial={reduce ? false : { opacity: 0, scale: 0.85, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          className="relative rounded-chunk border-2 border-neon-cyan bg-ink px-4 py-2.5 text-center text-body font-bold leading-snug text-space-950 shadow-glow-cyan"
        >
          <span aria-hidden="true" className={`absolute h-3 w-3 rotate-45 border-neon-cyan bg-ink ${tailCls}`} />
          {text}
        </motion.p>
      ) : null}
    </div>
  );
}

/**
 * Braylee as the app's host: her face in the astronaut helmet (public /api/avatar/host photo, emoji fallback on 404),
 * a big welcome wave, then idle with an occasional extra wave. `lines[0]` is the first-visit line; with
 * `storageKey` later visits skip it. When there is more than one line they rotate slowly.
 * Reduced motion: static pose, no waves, no rotation.
 */
export default function HostAstronaut({ size = 150, lines = [HOST_WELCOME], storageKey, layout = 'stack', className = '' }) {
  const reduce = useReducedMotion();
  const [pose, setPose] = useState('welcome');
  const [idx, setIdx] = useState(null);
  const [order, setOrder] = useState(lines);

  // Pick the starting line: first visit = welcome line, later visits = the friendly rotation
  useEffect(() => {
    let seen = false;
    try {
      if (storageKey) seen = localStorage.getItem(storageKey) === '1';
    } catch (_) {}
    // Mark as seen only after the welcome line has been on screen a moment (also survives StrictMode's double effect)
    const mark = setTimeout(() => { try { if (storageKey) localStorage.setItem(storageKey, '1'); } catch (_) {} }, 1500);
    const list = seen && lines.length > 1 ? lines.slice(1) : lines;
    setOrder(list);
    setIdx(0);
    return () => clearTimeout(mark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (reduce) return undefined;
    const t = setTimeout(() => setPose('idle'), POSE_MS.welcome);
    return () => clearTimeout(t);
  }, [reduce]);

  // Occasional wave
  useEffect(() => {
    if (reduce) return undefined;
    let back;
    const id = setInterval(() => {
      setPose('welcome');
      back = setTimeout(() => setPose('idle'), POSE_MS.welcome);
    }, 14000);
    return () => { clearInterval(id); clearTimeout(back); };
  }, [reduce]);

  // Rotate lines
  useEffect(() => {
    if (reduce || order.length < 2) return undefined;
    const id = setInterval(() => setIdx((i) => ((i ?? 0) + 1) % order.length), 8000);
    return () => clearInterval(id);
  }, [reduce, order]);

  const text = idx === null ? '' : order[idx % order.length];
  const row = layout === 'row';
  return (
    <div className={`flex ${row ? 'flex-row items-center gap-4 text-left' : 'flex-col items-center gap-3 text-center'} ${className}`}>
      <div className="shrink-0">
        <Astronaut host hostAlt={HOST_ALT} pose={reduce ? 'idle' : pose} size={size} />
      </div>
      <SpeechBubble text={text} tail={row ? 'left' : 'top'} className={row ? 'min-w-0 flex-1' : 'w-full max-w-[19rem]'} />
    </div>
  );
}
