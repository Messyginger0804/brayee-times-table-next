"use client";
import { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAvatarSrc } from './AstronautHelmet';

/**
 * Rigged cartoon astronaut drawn in SVG. Every body part is its own <motion.g> driven by the
 * `pose` variant. Only transform + opacity are animated. With prefers-reduced-motion each pose is a
 * static snapshot (no motion at all). Purely decorative: aria-hidden, pointer-events none.
 */

export const POSES = ['idle', 'welcome', 'correct', 'streak', 'tryAgain', 'levelUp'];
/** How long each reaction plays before the stage returns to idle (ms). */
export const POSE_MS = { welcome: 2600, correct: 1700, streak: 2800, tryAgain: 3600, levelUp: 4200 };

const VB_W = 180;
const VB_H = 220;
export const ASTRONAUT_RATIO = VB_H / VB_W;

const C = {
  suit: '#f4f7ff', shade: '#d3dbf6', line: '#1b2670', dark: '#0a1030', panel: '#121a4a',
  cyan: '#38f0ff', pink: '#ff5fd7', lime: '#b6ff3b', amber: '#ffc531', violet: '#a98bff', coral: '#ff7a8a',
};

const BASE = { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1 };
const EASE = { duration: 0.4, ease: 'easeOut' };
const LOOP = { repeat: Infinity, ease: 'easeInOut' };

/**
 * part(base, { pose: [to, keyframes, transition] }): builds Framer variants.
 * `to` is the static snapshot (used for reduced motion and for props without keyframes).
 */
function build(reduced, base, poses) {
  const out = {};
  for (const name of POSES) {
    const [to = {}, kf = null, t = null] = poses[name] || [];
    if (reduced) {
      out[name] = { ...BASE, ...base, ...to, transition: { duration: 0 } };
    } else {
      const target = { ...BASE, ...base, ...to, ...(kf || {}) };
      const transition = { default: EASE };
      if (kf) Object.keys(kf).forEach((k) => { transition[k] = t; });
      out[name] = { ...target, transition };
    }
  }
  return out;
}

const origin = (x, y) => ({ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` });

// ---- shared keyframe timelines -------------------------------------------------------------
// tryAgain (3.6s): shrug 0-1.3s, thumbs-up 1.3-3.4s
const TA_T = { duration: 3.6, times: [0, 0.1, 0.33, 0.42, 0.52, 0.9, 1], ease: 'easeInOut' };
// correct (1.7s)
const CO_T = { duration: 1.7, times: [0, 0.15, 0.35, 0.5, 0.65, 0.8, 1], ease: 'easeOut' };
// streak flip (2.8s); the last two stops are 1ms apart so -360deg snaps invisibly back to 0deg
const ST_T = { duration: 2.8, times: [0, 0.3, 0.45, 0.6, 0.999, 1], ease: 'easeInOut' };

function buildAll(reduced) {
  const v = (base, poses) => build(reduced, base, poses);
  return {
    root: v({}, {
      idle: [{}, { y: [0, -6, 0], rotate: [-1.5, 1.5, -1.5] }, { duration: 4, ...LOOP }],
      welcome: [{}, { y: [0, -5, 0, -5, 0] }, { duration: 2.4, ease: 'easeInOut' }],
      correct: [{}, { y: [0, 3, -26, -24, 0, -5, 0] }, CO_T],
      streak: [{}, { y: [0, -26, -34, -30, 0, 0], rotate: [0, 0, -180, -360, -360, 0] }, ST_T],
      tryAgain: [{}, { y: [0, -3, -3, 0, 0, -3, 0] }, TA_T],
      levelUp: [{ x: -14 }, { y: [0, -14, 0, -8, 0] }, { duration: 1.6, ease: 'easeInOut' }],
    }),
    helmet: v({}, {
      idle: [{}, { rotate: [-2, 2, -2] }, { duration: 5, ...LOOP }],
      welcome: [{ rotate: 5 }, { rotate: [0, 6, -4, 6, 0] }, { duration: 2.4, ease: 'easeInOut' }],
      correct: [{ rotate: -6 }, { rotate: [0, -8, -8, 0] }, { duration: 1.7, ease: 'easeInOut' }],
      streak: [{}],
      tryAgain: [{ rotate: 0 }, { rotate: [0, 8, 8, 0, 0, 0, 0] }, TA_T],
      levelUp: [{}],
    }),
    armL: v({ rotate: 12 }, {
      idle: [{ rotate: 12 }, { rotate: [12, 16, 12] }, { duration: 4, ...LOOP }],
      welcome: [{ rotate: 25 }],
      correct: [{ rotate: 22 }],
      streak: [{ rotate: 135 }, { rotate: [12, 135, 135, 12] }, { duration: 2.8, times: [0, 0.15, 0.85, 1], ease: 'easeOut' }],
      tryAgain: [{ rotate: 12 }, { rotate: [12, 30, 30, 12, 12, 12, 12] }, TA_T],
      levelUp: [{ rotate: 140 }, { rotate: [12, 140, 130, 140, 130, 140] }, { duration: 2.4, ease: 'easeInOut' }],
    }),
    foreL: v({ rotate: 6 }, {
      idle: [{ rotate: 6 }],
      welcome: [{ rotate: 10 }],
      correct: [{ rotate: 8 }],
      streak: [{ rotate: 15 }],
      tryAgain: [{ rotate: 6 }, { rotate: [6, 70, 70, 6, 6, 6, 6] }, TA_T],
      levelUp: [{ rotate: 8 }],
    }),
    armR: v({ rotate: -12 }, {
      idle: [{ rotate: -12 }, { rotate: [-12, -12, -145, -145, -145, -145, -145, -12, -12] },
        { duration: 9, times: [0, 0.6, 0.67, 0.72, 0.77, 0.82, 0.87, 0.94, 1], ...LOOP }],
      welcome: [{ rotate: -150 }, { rotate: [-12, -150, -150, -150, -150, -150, -150, -150] },
        { duration: 2.6, times: [0, 0.12, 0.3, 0.45, 0.6, 0.75, 0.88, 1], ease: 'easeInOut' }],
      correct: [{ rotate: -140 }, { rotate: [-12, -150, -135, -150, -135, -150, -12] }, CO_T],
      streak: [{ rotate: -135 }, { rotate: [-12, -135, -135, -12] }, { duration: 2.8, times: [0, 0.15, 0.85, 1], ease: 'easeOut' }],
      tryAgain: [{ rotate: -35 }, { rotate: [-12, -30, -30, -12, -35, -35, -12] }, TA_T],
      levelUp: [{ rotate: -80 }, { rotate: [-12, -100, -80] }, { duration: 1.4, times: [0, 0.35, 0.6], ease: 'easeOut' }],
    }),
    foreR: v({ rotate: -6 }, {
      idle: [{ rotate: -6 }, { rotate: [-6, -6, -10, -45, 10, -45, 10, -10, -6] },
        { duration: 9, times: [0, 0.6, 0.67, 0.72, 0.77, 0.82, 0.87, 0.94, 1], ...LOOP }],
      welcome: [{ rotate: -10 }, { rotate: [-6, -10, -50, 15, -50, 15, -50, -6] },
        { duration: 2.6, times: [0, 0.12, 0.3, 0.45, 0.6, 0.75, 0.88, 1], ease: 'easeInOut' }],
      correct: [{ rotate: -20 }, { rotate: [-6, -20, -60, -20, -60, -20, -6] }, CO_T],
      streak: [{ rotate: -15 }],
      tryAgain: [{ rotate: -125 }, { rotate: [-6, -70, -70, -6, -125, -125, -6] }, TA_T],
      levelUp: [{ rotate: -4 }],
    }),
    thumb: v({ opacity: 0 }, {
      tryAgain: [{ opacity: 1 }, { opacity: [0, 0, 0, 0, 1, 1, 1] }, TA_T],
    }),
    legL: v({}, {
      idle: [{}, { rotate: [-3, 3, -3] }, { duration: 4, ...LOOP }],
      welcome: [{}],
      correct: [{ rotate: -16 }, { rotate: [0, 8, -20, -20, 8, 0, 0] }, CO_T],
      streak: [{ rotate: 2 }, { rotate: [0, 2, 2, 2, 0, 0] }, ST_T],
      tryAgain: [{}],
      levelUp: [{}],
    }),
    legR: v({}, {
      idle: [{}, { rotate: [3, -3, 3] }, { duration: 4, ...LOOP }],
      welcome: [{}],
      correct: [{ rotate: 20 }, { rotate: [0, -8, 25, 25, -8, 0, 0] }, CO_T],
      streak: [{ rotate: -2 }, { rotate: [0, -2, -2, -2, 0, 0] }, ST_T],
      tryAgain: [{}],
      levelUp: [{}],
    }),
    flame: v({ opacity: 0, scaleY: 0 }, {
      streak: [{ opacity: 1, scaleY: 1 },
        { opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0], scaleY: [0, 1, 0.7, 1.2, 0.8, 1.1, 0.7, 1.2, 0.8, 0.6, 0] },
        { duration: 2.8, times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], ease: 'linear' }],
    }),
    sparkle: v({ opacity: 0, scale: 0 }, {
      correct: [{ opacity: 1, scale: 1 }, { opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0], y: [0, -6, -12, -18] }, { duration: 1.3, ease: 'easeOut' }],
      streak: [{ opacity: 1, scale: 1 }, { opacity: [0, 1, 1, 0], scale: [0, 1.3, 1, 0], y: [0, -8, -16, -26] }, { duration: 2, ease: 'easeOut' }],
      levelUp: [{ opacity: 1, scale: 1 }, { opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0] }, { duration: 1.6, ease: 'easeOut', delay: 0.9 }],
    }),
    planet: v({ opacity: 0, y: 30 }, {
      levelUp: [{ opacity: 1, y: 0 }, { opacity: [0, 1], y: [30, 0] }, { duration: 0.5, ease: 'easeOut' }],
    }),
    flag: v({ opacity: 0, y: -70 }, {
      levelUp: [{ opacity: 1, y: 0 }, { opacity: [0, 1, 1, 1, 1], y: [-70, -70, 4, -3, 0] }, { duration: 1.6, times: [0, 0.3, 0.55, 0.75, 1], ease: 'easeOut', delay: 0.5 }],
    }),
    pennant: v({}, {
      levelUp: [{}, { scaleX: [1, 0.8, 1.1, 0.85, 1] }, { duration: 1.1, repeat: 3, delay: 2, ease: 'easeInOut' }],
    }),
    confetti: v({ opacity: 0 }, {
      levelUp: [{ opacity: 0 }, { opacity: [0, 1, 1, 0], y: [-10, 60, 130, 215], rotate: [0, 180, 360, 540] }, { duration: 2.6, ease: 'easeIn', delay: 0.9 }],
    }),
  };
}

const SPARKS = [
  { x: 22, y: 44, c: C.amber }, { x: 160, y: 50, c: C.cyan }, { x: 30, y: 122, c: C.pink },
  { x: 154, y: 112, c: C.lime }, { x: 58, y: 8, c: C.violet }, { x: 124, y: 6, c: C.amber },
];
const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  x: 8 + ((i * 47) % 164), c: [C.pink, C.cyan, C.lime, C.amber, C.violet, C.coral][i % 6], d: i * 0.09, w: 5 + (i % 3) * 2,
}));
const STAR = 'M0,-9 L2.5,-2.5 L9,0 L2.5,2.5 L0,9 L-2.5,2.5 L-9,0 L-2.5,-2.5Z';

const outline = { stroke: C.line, strokeWidth: 2.5, strokeLinejoin: 'round' };

function Arm({ cx, vArm, vFore, thumb, vThumb }) {
  const sh = origin(cx, 122);
  const el = origin(cx, 144);
  return (
    <motion.g variants={vArm} style={sh}>
      <rect x={cx - 7} y={116} width={14} height={30} rx={7} fill={C.suit} {...outline} />
      <motion.g variants={vFore} style={el}>
        <rect x={cx - 7} y={142} width={14} height={26} rx={7} fill={C.suit} {...outline} />
        <rect x={cx - 8.5} y={160} width={17} height={7} rx={3.5} fill={C.cyan} {...outline} />
        {thumb && (
          <motion.rect variants={vThumb} x={cx - 4} y={176} width={8} height={14} rx={4} fill={C.suit} {...outline} />
        )}
        <circle cx={cx} cy={173} r={10} fill={C.suit} {...outline} />
        {/* mitten crease */}
        <path d={`M${cx - 3},176 q3,3 6,0`} fill="none" stroke={C.shade} strokeWidth={1.5} strokeLinecap="round" />
      </motion.g>
    </motion.g>
  );
}

export default function Astronaut({ pose = 'idle', size = 120, className = '', style, host = false, hostAlt }) {
  const reduce = useReducedMotion();
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9]/g, '');
  const src = useAvatarSrc(size * 3, host);
  const V = useMemo(() => buildAll(!!reduce), [reduce]);
  const p = POSES.includes(pose) ? pose : 'idle';

  return (
    <motion.svg
      {...(hostAlt ? { role: 'img', 'aria-label': hostAlt } : { 'aria-hidden': 'true' })}
      focusable="false"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={size}
      height={Math.round(size * ASTRONAUT_RATIO)}
      className={`pointer-events-none select-none ${className}`}
      style={{ overflow: 'visible', pointerEvents: 'none', ...style }}
      initial={false}
      animate={p}
    >
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor={C.shade} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c2" />
          <stop offset="0.45" stopColor={C.amber} />
          <stop offset="1" stopColor={C.coral} />
        </linearGradient>
        <radialGradient id={`${id}p`} cx="0.35" cy="0.2" r="0.9">
          <stop offset="0" stopColor={C.violet} />
          <stop offset="1" stopColor="#4b2fa8" />
        </radialGradient>
        <clipPath id={`${id}v`}><circle cx="90" cy="62" r="36" /></clipPath>
        <clipPath id={`${id}c`}><rect x="0" y="0" width={VB_W} height={VB_H} /></clipPath>
      </defs>

      {/* small planet (level up) */}
      <motion.g variants={V.planet} clipPath={`url(#${id}c)`}>
        <ellipse cx="90" cy="254" rx="96" ry="48" fill={`url(#${id}p)`} stroke={C.line} strokeWidth={2.5} />
        <ellipse cx="50" cy="222" rx="9" ry="3.5" fill="#4b2fa8" opacity="0.7" />
        <ellipse cx="128" cy="230" rx="12" ry="4" fill="#4b2fa8" opacity="0.7" />
      </motion.g>

      {/* flag */}
      <motion.g variants={V.flag}>
        <rect x="155" y="104" width="3" height="104" rx="1.5" fill={C.suit} {...outline} strokeWidth={1.5} />
        <motion.g variants={V.pennant} style={origin(158, 112)}>
          <path d="M158,106 L178,113 L158,121Z" fill={C.pink} {...outline} strokeWidth={1.5} />
        </motion.g>
      </motion.g>

      {/* whole body */}
      <motion.g variants={V.root} style={origin(90, 120)}>
        {/* jet flames */}
        <motion.g variants={V.flame} style={origin(58, 168)}>
          <path d="M51,168 Q58,214 65,168Z" fill={`url(#${id}f)`} />
          <path d="M55,168 Q58,196 61,168Z" fill="#fff6c2" opacity="0.9" />
        </motion.g>
        <motion.g variants={V.flame} style={origin(122, 168)}>
          <path d="M115,168 Q122,214 129,168Z" fill={`url(#${id}f)`} />
          <path d="M119,168 Q122,196 125,168Z" fill="#fff6c2" opacity="0.9" />
        </motion.g>

        {/* jetpack */}
        <rect x="46" y="110" width="88" height="54" rx="16" fill={C.shade} {...outline} />
        <rect x="50" y="114" width="18" height="46" rx="9" fill={C.violet} {...outline} strokeWidth={2} />
        <rect x="112" y="114" width="18" height="46" rx="9" fill={C.violet} {...outline} strokeWidth={2} />
        <rect x="53" y="119" width="4" height="22" rx="2" fill="#fff" opacity="0.55" />
        <rect x="115" y="119" width="4" height="22" rx="2" fill="#fff" opacity="0.55" />
        <rect x="51" y="160" width="14" height="8" rx="3" fill={C.panel} {...outline} strokeWidth={2} />
        <rect x="115" y="160" width="14" height="8" rx="3" fill={C.panel} {...outline} strokeWidth={2} />

        {/* legs */}
        <motion.g variants={V.legL} style={origin(75, 162)}>
          <rect x="64" y="158" width="22" height="30" rx="10" fill={C.suit} {...outline} />
          <rect x="59" y="184" width="30" height="24" rx="11" fill={C.pink} {...outline} />
          <rect x="63" y="198" width="22" height="5" rx="2.5" fill="#fff" opacity="0.5" />
        </motion.g>
        <motion.g variants={V.legR} style={origin(105, 162)}>
          <rect x="94" y="158" width="22" height="30" rx="10" fill={C.suit} {...outline} />
          <rect x="91" y="184" width="30" height="24" rx="11" fill={C.pink} {...outline} />
          <rect x="95" y="198" width="22" height="5" rx="2.5" fill="#fff" opacity="0.5" />
        </motion.g>

        {/* torso */}
        <rect x="60" y="102" width="60" height="66" rx="22" fill={`url(#${id}s)`} {...outline} />
        <rect x="60" y="152" width="60" height="9" fill={C.pink} stroke={C.line} strokeWidth={2} />
        <rect x="72" y="120" width="36" height="22" rx="7" fill={C.panel} {...outline} strokeWidth={2} />
        <circle cx="81" cy="131" r="3.6" fill={C.pink} />
        <circle cx="90" cy="131" r="3.6" fill={C.lime} />
        <circle cx="99" cy="131" r="3.6" fill={C.amber} />

        {/* arms (behind the helmet) */}
        <Arm cx={58} vArm={V.armL} vFore={V.foreL} />
        <Arm cx={122} vArm={V.armR} vFore={V.foreR} thumb vThumb={V.thumb} />

        {/* helmet */}
        <motion.g variants={V.helmet} style={origin(90, 108)}>
          <line x1="90" y1="13" x2="90" y2="5" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx="90" cy="4" r="4" fill={C.amber} {...outline} strokeWidth={2} />
          <circle cx="39" cy="64" r="7" fill={C.violet} {...outline} />
          <circle cx="141" cy="64" r="7" fill={C.violet} {...outline} />
          <circle cx="90" cy="62" r="50" fill={`url(#${id}s)`} {...outline} />
          <circle cx="90" cy="62" r="42" fill={C.dark} stroke={C.cyan} strokeWidth={3} />
          <g clipPath={`url(#${id}v)`}>
            <circle cx="90" cy="62" r="36" fill={C.panel} />
            {src ? (
              <image href={src} x="54" y="26" width="72" height="72" preserveAspectRatio="xMidYMid slice" />
            ) : (
              <text x="90" y="76" textAnchor="middle" fontSize="44">👩‍🚀</text>
            )}
          </g>
          <ellipse cx="74" cy="44" rx="15" ry="7" transform="rotate(-30 74 44)" fill="#fff" opacity="0.4" />
          <circle cx="90" cy="62" r="36" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth={1.5} />
          <ellipse cx="90" cy="110" rx="20" ry="5.5" fill={C.pink} {...outline} strokeWidth={2} />
        </motion.g>
      </motion.g>

      {/* sparkles */}
      {SPARKS.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <motion.path
            d={STAR}
            fill={s.c}
            variants={V.sparkle}
          />
        </g>
      ))}

      {/* confetti */}
      {CONFETTI.map((c, i) => (
        <motion.rect
          key={i}
          x={c.x}
          y={-((i * 13) % 40)}
          width={c.w}
          height={c.w * 1.6}
          rx={1.5}
          fill={c.c}
          variants={V.confetti}
        />
      ))}
    </motion.svg>
  );
}
