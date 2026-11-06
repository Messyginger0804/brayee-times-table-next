"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './useSpaceEnv';
import { hasWebGL } from './useSpaceEnv';
import { gameFx, useGameFx } from '../../lib/gameFx';
import { sceneFx, useSceneState } from '../../lib/sceneFx';

// Three.js is code-split and client-only; never part of the initial JS.
const SpaceScene = dynamic(() => import('./SpaceScene'), { ssr: false, loading: () => null });

function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

/** Emoji rocket shown until (or instead of) the 3D one. Same easing: asymptotic climb, never leaves the screen. */
function FallbackRocket({ correct, reduced }) {
  const phone = usePhone();
  const climb = 1 - Math.exp(-correct / 6);
  return (
    <div
      className="absolute right-3 text-3xl select-none"
      style={{
        // phones: stay in the top band, clear of the question and keypad
        ...(phone ? { top: `${20 - climb * 11}%` } : { bottom: `calc(${6 + climb * 70}% )` }),
        transition: reduced ? 'none' : `${phone ? 'top' : 'bottom'} 900ms cubic-bezier(.2,.8,.2,1)`,
        filter: 'drop-shadow(0 0 8px rgba(56,240,255,.6))',
      }}
    >
      <span style={{ display: 'inline-block', transform: 'rotate(-45deg) translate(0,0)' }}>🚀</span>
    </div>
  );
}

/** Mirrors motion/ready state into the scene store and turns level-up events into the 3D party. Returns whether it is on. */
function useSceneBridge(reduced, ready) {
  const celebrating = useSceneState((st) => st.celebrating);
  useEffect(() => { sceneFx.set({ reduced }); }, [reduced]);
  useEffect(() => { sceneFx.set({ ready }); }, [ready]);
  useEffect(() => gameFx.on((e) => {
    if (e.type === 'levelUp' || e.type === 'mastered') sceneFx.celebrate(e.type);
  }), []);
  return celebrating;
}

/**
 * Fixed full-screen backdrop behind all UI. Always renders the CSS gradient + starfield (instant,
 * costs nothing). The WebGL scene is mounted after idle, only if WebGL works and the user has not
 * asked for reduced motion; it never receives pointer events, so it cannot block input.
 */
export default function SpaceBackground() {
  const reduced = usePrefersReducedMotion();
  const [want3d, setWant3d] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const { correct } = useGameFx();
  const celebrating = useSceneBridge(reduced, sceneReady);

  useEffect(() => {
    let cancelled = false;
    const start = () => { if (!cancelled && hasWebGL()) setWant3d(true); };
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 1500 })
      : window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-space-gradient pointer-events-none">
      <div className={`absolute inset-0 transition-opacity duration-700 ${sceneReady ? 'opacity-0' : 'opacity-100'}`}>
        <div className="stars stars-a" />
        <div className="stars stars-b" />
        <div className="stars stars-c" />
      </div>
      {!sceneReady && <FallbackRocket correct={correct} reduced={reduced} />}
      {/* Own layer so it can hop above the page for the ~2s level-up party (never receives pointer events) */}
      {want3d && (
        <div className="pointer-events-none fixed inset-0" style={{ zIndex: celebrating ? 45 : -9 }}>
          <SpaceScene reduced={reduced} onReady={() => setSceneReady(true)} onFail={() => { setWant3d(false); setSceneReady(false); }} />
        </div>
      )}
    </div>
  );
}
