"use client";
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Circular photo (or emoji fallback) inside a glowing astronaut helmet.
 * The photo comes from /api/avatar (private, per-user). On 401/404 we show the emoji astronaut.
 */
/** Fetches the (private, per-user) astronaut photo. Returns an object URL, or null on 401/404/error. */
export function useAvatarSrc(size = 160, host = false, enabled = true) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url = null;
    let cancelled = false;
    if (!enabled) return undefined;
    // host=true uses the public host photo (no session); otherwise the caller's own photo
    fetch(`/api/avatar${host ? '/host' : ''}?size=${size > 100 ? 512 : 160}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || cancelled) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [size, host, enabled]);
  return enabled ? src : null;
}

function AstronautHelmet({ size = 96, float = true, photo = true, className = '' }) {
  const reduce = useReducedMotion();
  const src = useAvatarSrc(size, false, photo);

  const animate = float && !reduce;
  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size, filter: 'drop-shadow(0 0 10px rgba(56,240,255,0.55)) drop-shadow(0 0 22px rgba(169,139,255,0.35))' }}
      animate={animate ? { y: [0, -size * 0.06, 0], rotate: [-1.5, 1.5, -1.5] } : undefined}
      transition={animate ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      {/* Outer helmet shell and rim */}
      <div className="absolute inset-0 rounded-full border-[3px] border-neon-cyan bg-gradient-to-b from-space-600 to-space-800" />
      <div className="absolute rounded-full border border-ink/40 bg-space-950 shadow-[inset_0_0_14px_rgba(56,240,255,0.5)]" style={{ inset: '8%' }} />
      {/* Visor content */}
      <div className="absolute overflow-hidden rounded-full bg-space-700" style={{ inset: '11%' }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Your astronaut photo" className="h-full w-full object-cover" style={{ objectPosition: '50% 40%' }} />
        ) : (
          <div role="img" aria-label="Astronaut" className="flex h-full w-full items-center justify-center" style={{ fontSize: size * 0.5 }}>👩‍🚀</div>
        )}
        {/* Glass reflection */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse 55% 35% at 30% 18%, rgba(255,255,255,0.45), rgba(255,255,255,0) 70%), linear-gradient(160deg, rgba(56,240,255,0.18), rgba(169,139,255,0.10) 60%, rgba(0,0,0,0.18))' }} />
        {/* Shine sweep */}
        {animate && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-y-1/4 w-1/4 -skew-x-12 bg-white/30 blur-[2px]"
            initial={{ left: '-40%' }}
            animate={{ left: ['-40%', '140%'] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
          />
        )}
      </div>
      {/* Neck-ring accents */}
      <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 rounded-full bg-neon-pink shadow-glow-pink" style={{ bottom: '-1%', width: '16%', height: '5%' }} />
    </motion.div>
  );
}

export default AstronautHelmet;
