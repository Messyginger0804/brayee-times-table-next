"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Astronaut, { ASTRONAUT_RATIO, POSE_MS } from '../space/Astronaut';
import { gameFx } from '../../lib/gameFx';
import { pickLine } from '../../config/brayleeLines';
import { speakCheer } from '../../lib/cheerVoice';
import { director, useModalHeld } from '../../lib/momentDirector';

const PRIORITY = { idle: 0, welcome: 1, correct: 2, tryAgain: 3, streak: 4, levelUp: 5 };
// gameFx event -> pose and Braylee line moment. An event may carry its own `moment` (e.g. 'spellingCorrect').
const REACTIONS = {
  correct: ['correct', 'correct'],
  wrong: ['tryAgain', 'wrong'],
  streak: ['streak', 'streak'],
  levelUp: ['levelUp', 'levelUp'],
  session: ['welcome', 'session'],
};

/**
 * The player's own astronaut (her photo only when Braylee is playing, the emoji for guests) plus the speech bubble.
 * Listens to gameFx events (correct / wrong / streak / levelUp / session), plays the matching pose once, shows a cheer
 * line from config/brayleeLines.js and speaks it via cheerVoice. The bubble is the lowest-ranked moment: it is dropped
 * while a GIF card or modal is up (lib/momentDirector.js), and the whole astronaut hides behind a modal's own astronaut.
 * Plays `welcome` on mount (no bubble). Higher-priority poses are never interrupted.
 * Never takes pointer events. The bubble text lives in a polite live region.
 */
export default function AstronautStage({ size = 92, listen = true, className = 'relative' }) {
  const reduce = useReducedMotion();
  const [pose, setPose] = useState('welcome');
  const [line, setLine] = useState('');
  const cur = useRef('welcome');
  const timer = useRef(null);
  const lastLine = useRef('');

  const releaseBubble = useRef(null);
  const endBubble = useCallback(() => { releaseBubble.current?.(); releaseBubble.current = null; setLine(''); }, []);

  const play = useCallback((next, moment, n) => {
    // A bigger moment is never interrupted by a smaller one (e.g. correct right after streak)
    if (PRIORITY[next] < PRIORITY[cur.current] && cur.current !== 'idle') return;
    cur.current = next;
    setPose(next);
    releaseBubble.current?.();
    releaseBubble.current = null;
    let text = pickLine(moment, { n, avoid: [lastLine.current] }) || '';
    // Dropped (not queued) when a card or modal already holds the stage
    if (text) releaseBubble.current = director.claim('bubble', () => { releaseBubble.current = null; setLine(''); });
    if (!releaseBubble.current) text = '';
    lastLine.current = text || lastLine.current;
    setLine(text);
    speakCheer(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      cur.current = 'idle';
      setPose('idle');
      endBubble();
    }, POSE_MS[next]);
  }, [endBubble]);

  useEffect(() => {
    timer.current = setTimeout(() => { cur.current = 'idle'; setPose('idle'); }, POSE_MS.welcome);
    return () => { clearTimeout(timer.current); releaseBubble.current?.(); };
  }, []);

  useEffect(() => {
    if (!listen) return undefined;
    return gameFx.on((e) => {
      const r = REACTIONS[e.type];
      if (r) play(r[0], e.moment || r[1], e.n);
    });
  }, [listen, play]);

  const modalHeld = useModalHeld();
  return (
    <div
      className={`pointer-events-none shrink-0 ${modalHeld ? 'invisible' : ''} ${className}`}
      style={{ width: size, height: Math.round(size * ASTRONAUT_RATIO) }}
    >
      <Astronaut pose={pose} size={size} />
      {/* The bubble hangs below the astronaut so it never covers the level / streak / stars chips beside or above it */}
      <div aria-live="polite" role="status" className="pointer-events-none absolute left-1 top-[94%] z-50">
        {line && (
          <motion.p
            key={line}
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{ transformOrigin: 'top left' }}
            className="relative w-max max-w-[9.5rem] rounded-chunk border-2 border-neon-cyan bg-ink px-3 py-1.5 text-body font-bold leading-tight text-space-950 shadow-glow-cyan"
          >
            <span aria-hidden="true" className="absolute -top-[7px] left-7 h-3 w-3 rotate-45 border-l-2 border-t-2 border-neon-cyan bg-ink" />
            {line}
          </motion.p>
        )}
      </div>
    </div>
  );
}
