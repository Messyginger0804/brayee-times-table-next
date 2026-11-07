"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Astronaut, { ASTRONAUT_RATIO, POSE_MS } from '../space/Astronaut';
import { gameFx } from '../../lib/gameFx';
import { pickLine } from '../../config/brayleeLines';
import { speakCheer } from '../../lib/cheerVoice';
import ReplayBubble from './ReplayBubble';

const PRIORITY = { idle: 0, welcome: 1, correct: 2, tryAgain: 3, streak: 4, levelUp: 5 };
// gameFx event -> pose and Braylee line moment. An event may carry its own `moment` (e.g. 'spellingCorrect').
const REACTIONS = {
  correct: ['correct', 'correct'],
  wrong: ['tryAgain', 'wrong'],
  streak: ['streak', 'streak'],
  levelUp: ['levelUp', 'levelUp'],
  session: ['welcome', 'session'],
};
const norm = (t) => String(t).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
// A bubble line that the GIF card already says (e.g. "So close!" vs "So close! Try that one again") is skipped
const repeatsGif = (line) => {
  const g = norm(gameFx.getGifMessage());
  const l = norm(line);
  return !!g && (g.includes(l) || l.includes(g));
};

/**
 * Braylee (her face in the helmet, for every player) plus her speech bubble. Listens to gameFx events
 * (correct / wrong / streak / levelUp / session), plays the matching pose once, shows a cheer line from
 * config/brayleeLines.js (skipped when the GIF card already says it) and speaks that same line via cheerVoice.
 * Plays `welcome` on mount (no bubble). Higher-priority poses are never interrupted.
 * Only the bubble takes pointer events (tap = hear her say it again). The text is announced from a polite live region.
 */
export default function AstronautStage({ size = 92, listen = true, className = 'relative' }) {
  const reduce = useReducedMotion();
  const [pose, setPose] = useState('welcome');
  const [line, setLine] = useState('');
  const cur = useRef('welcome');
  const timer = useRef(null);
  const lastLine = useRef('');

  // A fresh line for `moment` that the GIF card is not already saying; '' if every option repeats it
  const chooseLine = useCallback((moment, n) => {
    const tried = [];
    for (let i = 0; i < 6; i++) {
      const l = pickLine(moment, { n, avoid: [lastLine.current, ...tried] });
      if (!l || tried.includes(l)) break;
      if (!repeatsGif(l)) return l;
      tried.push(l);
    }
    return '';
  }, []);

  const play = useCallback((next, moment, n) => {
    // A bigger moment is never interrupted by a smaller one (e.g. correct right after streak)
    if (PRIORITY[next] < PRIORITY[cur.current] && cur.current !== 'idle') return;
    cur.current = next;
    setPose(next);
    const text = chooseLine(moment, n);
    lastLine.current = text || lastLine.current;
    setLine(text);
    speakCheer(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      cur.current = 'idle';
      setPose('idle');
      setLine('');
    }, POSE_MS[next]);
  }, [chooseLine]);

  useEffect(() => {
    timer.current = setTimeout(() => { cur.current = 'idle'; setPose('idle'); }, POSE_MS.welcome);
    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!listen) return undefined;
    return gameFx.on((e) => {
      const r = REACTIONS[e.type];
      if (r) play(r[0], e.moment || r[1], e.n);
    });
  }, [listen, play]);

  return (
    <div
      className={`pointer-events-none shrink-0 ${className}`}
      style={{ width: size, height: Math.round(size * ASTRONAUT_RATIO) }}
    >
      <Astronaut host hostAlt="Braylee" pose={pose} size={size} />
      {/* The bubble hangs below the astronaut so it never covers the level / streak / stars chips beside or above it */}
      <div className="pointer-events-none absolute left-1 top-[94%] z-50">
        <div aria-live="polite" role="status" className="sr-only">{line}</div>
        {line && (
          <ReplayBubble
            key={line}
            text={line}
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            style={{ transformOrigin: 'top left' }}
            className="relative w-max max-w-[9.5rem] px-3 py-1.5 text-left leading-tight"
          >
            <span aria-hidden="true" className="absolute -top-[7px] left-7 h-3 w-3 rotate-45 border-l-2 border-t-2 border-neon-cyan bg-ink" />
          </ReplayBubble>
        )}
      </div>
    </div>
  );
}
