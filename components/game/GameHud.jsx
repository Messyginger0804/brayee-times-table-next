"use client";
import { motion } from 'framer-motion';
import AnimatedNumber from '../ui/AnimatedNumber';
import LevelIndicator from '../LevelIndicator';
import AstronautStage from './AstronautStage';

/** Level / streak / score chips. Counters pop when they change. */
export default function GameHud({ level, streak, score, scoreLabel = 'Stars' }) {
  return (
    // Tall phones: the astronaut hangs into the (otherwise empty) GIF slot row below the stats.
    // Shorter screens: it sits beside the stats so nothing is covered.
    <div className="relative flex items-center justify-center gap-2">
    <AstronautStage size={92} className="relative [@media(min-height:820px)]:absolute [@media(min-height:820px)]:left-1 [@media(min-height:820px)]:top-full" />
    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 py-1 [@media(min-height:820px)]:justify-center" role="group" aria-label="Your stats">
      {level != null && <LevelIndicator level={level} />}
      <motion.span
        animate={streak >= 3 ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        key={streak >= 3 ? `s${streak}` : 's'}
        className="inline-flex items-center gap-1.5 rounded-full border border-neon-amber/60 bg-space-800/80 px-3 py-1 text-body font-bold text-neon-amber"
      >
        <span aria-hidden="true">🔥</span> Streak <AnimatedNumber value={streak} />
      </motion.span>
      {score != null && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-lime/60 bg-space-800/80 px-3 py-1 text-body font-bold text-neon-lime">
          <span aria-hidden="true">⭐</span> {scoreLabel} <AnimatedNumber value={score} />
        </span>
      )}
    </div>
    </div>
  );
}
