"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Astronaut, { ASTRONAUT_RATIO, POSE_MS } from '../space/Astronaut';
import { gameFx } from '../../lib/gameFx';

const PRIORITY = { idle: 0, welcome: 1, correct: 2, tryAgain: 3, streak: 4, levelUp: 5 };
const LINES = ['You got this!', 'So close!', 'Try again, Cadet!', 'Nice try, Cadet!', 'Almost there!', 'Keep going!', 'Shake it off, Cadet!'];
const norm = (t) => String(t).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
// A bubble line that the GIF card already says (e.g. "So close!" vs "So close! Try that one again") is skipped
const repeatsGif = (line) => {
  const g = norm(gameFx.getGifMessage());
  const l = norm(line);
  return !!g && (g.includes(l) || l.includes(g));
};

/**
 * The astronaut plus its speech bubble. Listens to gameFx events (correct / wrong / streak / levelUp /
 * session), plays the matching reaction once, then returns to idle. Plays `welcome` on mount.
 * Never takes pointer events. The bubble text lives in a polite live region.
 */
export default function AstronautStage({ size = 92, listen = true, className = 'relative' }) {
  const reduce = useReducedMotion();
  const [pose, setPose] = useState('welcome');
  const [line, setLine] = useState('');
  const cur = useRef('welcome');
  const timer = useRef(null);
  const lineIdx = useRef(Math.floor(Math.random() * LINES.length));

  const play = useCallback((next) => {
    // A bigger moment is never interrupted by a smaller one (e.g. correct right after streak)
    if (PRIORITY[next] < PRIORITY[cur.current] && cur.current !== 'idle') return;
    cur.current = next;
    setPose(next);
    if (next === 'tryAgain') {
      let tries = 0;
      do { lineIdx.current = (lineIdx.current + 1) % LINES.length; tries++; } while (repeatsGif(LINES[lineIdx.current]) && tries < LINES.length);
      setLine(repeatsGif(LINES[lineIdx.current]) ? '' : LINES[lineIdx.current]);
    } else {
      setLine('');
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      cur.current = 'idle';
      setPose('idle');
      setLine('');
    }, POSE_MS[next]);
  }, []);

  useEffect(() => {
    timer.current = setTimeout(() => { cur.current = 'idle'; setPose('idle'); }, POSE_MS.welcome);
    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!listen) return undefined;
    return gameFx.on((e) => {
      if (e.type === 'correct') play('correct');
      else if (e.type === 'wrong') play('tryAgain');
      else if (e.type === 'streak') play('streak');
      else if (e.type === 'levelUp') play('levelUp');
      else if (e.type === 'session') play('welcome');
    });
  }, [listen, play]);

  return (
    <div
      className={`pointer-events-none shrink-0 ${className}`}
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
