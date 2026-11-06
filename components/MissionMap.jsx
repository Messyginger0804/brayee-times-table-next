"use client";
import { motion, useReducedMotion } from 'framer-motion';
import BrayleeCheer from './braylee/BrayleeCheer';

const PLANETS = ['🪐', '🌍', '🌕', '🔴', '🟠', '🌎', '🟣', '🔵'];
const COLS = 3;
const shortName = (n) => n.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const ordinal = (g) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[g] || `${g}th`);

/** current = first open, unmastered mission. */
function missionStates(skills) {
  const firstOpen = skills.findIndex((s) => s.unlocked && !s.mastered);
  return skills.map((s, i) => ({
    ...s,
    state: s.mastered ? 'mastered' : !s.unlocked ? 'locked' : i === firstOpen ? 'current' : 'open',
  }));
}

/** Who gets the buddy: the current (first open, unmastered) mission, 'done' when all are mastered, else nothing. */
export function buddyFor(list) {
  const next = list.find((s) => s.state === 'current');
  if (next) return { kind: 'next', id: next.id };
  return list.length && list.every((s) => s.state === 'mastered') ? { kind: 'done' } : null;
}

function MapBuddy({ buddy }) {
  const reduce = useReducedMotion();
  if (!buddy) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none mb-2 flex items-center px-1"
      animate={reduce ? { y: 0 } : { y: [0, -4, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <BrayleeCheer layout="row" size={56} pose="idle" moment={buddy.kind === 'next' ? 'mapNudge' : 'idle'} className="w-full" />
    </motion.div>
  );
}

function progressText(s) {
  if (s.state === 'locked') return 'Locked';
  if (s.source === 'problems') return s.problems ? `${s.problems.mastered}/${s.problems.total} facts` : 'Facts';
  if (s.state === 'mastered') return 'Mastered!';
  return `Level ${s.levelIndex + 1} of ${s.levelCount}`;
}

const RING = {
  current: 'border-neon-amber shadow-glow-amber',
  mastered: 'border-neon-lime shadow-glow-lime',
  locked: 'border-white/15',
  open: 'border-neon-cyan shadow-glow-cyan',
};

function levelFraction(s) {
  if (s.state === 'mastered') return 1;
  const p = s.progress;
  const within = p?.levelNeed ? Math.min(1, p.levelHave / p.levelNeed) : 0;
  return (s.levelIndex + within) / s.levelCount;
}

function progressFraction(s) {
  if (s.source !== 'problems') return levelFraction(s);
  return s.problems?.total ? s.problems.mastered / s.problems.total : 0;
}

function PlanetOrb({ state, emoji, reduce }) {
  const locked = state === 'locked';
  return (
    <motion.span
      aria-hidden="true"
      animate={state === 'current' && !reduce ? { y: [0, -5, 0] } : { y: 0 }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 bg-space-800 text-[2rem] ${RING[state]} ${locked ? 'grayscale' : ''}`}
    >
      <span className={locked ? 'opacity-40' : ''}>{emoji}</span>
      {locked && <span className="absolute text-xl">🔒</span>}
      {state === 'mastered' && <span className="absolute -right-1 -top-1 text-xl">⭐</span>}
    </motion.span>
  );
}

function Planet({ s, idx, onPick }) {
  const reduce = useReducedMotion();
  const locked = s.state === 'locked';
  const frac = progressFraction(s);
  const name = shortName(s.name);
  return (
    <li className="relative z-10 flex justify-center" style={{ direction: 'ltr' }}>
      <button
        type="button"
        onClick={() => onPick(s)}
        aria-disabled={locked}
        aria-label={`${name}. ${progressText(s)}${s.state === 'current' ? '. Next mission' : ''}`}
        className="flex min-h-[7.25rem] w-full flex-col items-center gap-1 rounded-chunk px-1 py-1 text-center"
      >
        <PlanetOrb state={s.state} emoji={PLANETS[idx % PLANETS.length]} reduce={reduce} />
        <span className={`line-clamp-2 text-sm font-bold leading-tight ${locked ? 'text-ink-dim' : 'text-ink'}`}>{name}</span>
        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-space-700" aria-hidden="true">
          <span className={`block h-full rounded-full ${s.state === 'mastered' ? 'bg-neon-lime' : 'bg-neon-amber'}`} style={{ width: `${Math.round(frac * 100)}%` }} />
        </span>
        <span className="text-xs text-ink-dim">{progressText(s)}</span>
      </button>
    </li>
  );
}

/**
 * "Grade N Missions": the grade's skills as planets along a winding path (rows alternate direction).
 * Tapping an open planet starts it; a locked one calls onPick too so the page can explain.
 */
export default function MissionMap({ grade, skills, onPick }) {
  const list = missionStates(skills);
  // Snake path: odd rows run right-to-left (visually only; the DOM stays in mission order for screen readers)
  const rows = [];
  for (let i = 0; i < list.length; i += COLS) {
    rows.push(Array.from({ length: COLS }, (_, k) => (list[i + k] ? { s: list[i + k], idx: i + k } : null)));
  }
  const buddy = buddyFor(list);
  const done = list.filter((s) => s.state === 'mastered').length;
  return (
    <section aria-labelledby="missions-h" className="w-full max-w-md">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 id="missions-h" className="text-title text-neon-amber">Grade {grade} Missions</h2>
        <span className="text-body text-ink-dim">{done}/{list.length} done</span>
      </div>
      <div className="glass rounded-bubble px-2 py-3">
        <MapBuddy buddy={buddy} />
        {rows.map((row, r) => {
          const rtl = r % 2 === 1;
          const used = row.filter(Boolean).length;
          return (
            <div key={r} className="relative">
              {/* the path: dashed line through this row's planets, then down the turn column to the next row */}
              <div aria-hidden="true" className={`absolute top-9 border-t-2 border-dashed border-white/25 ${rtl ? 'right-[16.667%]' : 'left-[16.667%]'}`}
                style={{ width: `${(Math.max(used, 1) - 1) * 33.333}%` }} />
              {r < rows.length - 1 && (
                <div aria-hidden="true" className={`absolute top-9 h-full w-0 -translate-x-1/2 border-l-2 border-dashed border-white/25 ${rtl ? 'left-[16.667%]' : 'left-[83.333%]'}`} />
              )}
              <ol className="relative grid grid-cols-3" style={{ direction: rtl ? 'rtl' : 'ltr' }}>
                {row.map((c, k) => (c ? <Planet key={c.s.id} s={c.s} idx={c.idx} onPick={onPick} /> : <li key={`e${k}`} aria-hidden="true" />))}
              </ol>
            </div>
          );
        })}
      </div>
      <p className="sr-only">{ordinal(grade)} grade missions, {done} of {list.length} done.</p>
    </section>
  );
}
