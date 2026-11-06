"use client";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fx, sceneFx, useSceneState } from '../../lib/sceneFx';
import { CAM_Z, FOV, PointsCloud, TAN, rng, useSprite } from './sprites';
import { disposePlanetTextures } from './planetTextures';
import Rocket, { Burst, Trail } from './Rocket';
import MapPlanets from './MapPlanets';
import { BeeScene, HomePlanet, LoginPlanet, Nebula } from './SetPieces';
import { usePageVisible } from './useSpaceEnv';

// Only loaded the first time somebody levels up.
const Celebration = lazy(() => import('./Celebration'));

const CALM = 0.45; // star drift while answering (nothing busy near the question or keypad)

/** One parallax layer of points. Positions are stored as normalized (u,v) and mapped to the visible frustum. */
function StarLayer({ count, depth, size, speed, color, twinkle, phase, seed, reduced }) {
  const ref = useRef();
  const matRef = useRef();
  const pointer = useRef({ x: 0, y: 0 });
  const { size: vp } = useThree();
  const aspect = vp.width / vp.height;

  const data = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({ u: r() * 2 - 1, v: r() * 2 - 1 }));
  }, [count, seed]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const sprite = useSprite('dot');

  useEffect(() => {
    if (reduced) return undefined;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const halfH = (CAM_Z - depth) * TAN;
    const halfW = halfH * aspect;
    const sp = reduced ? 0 : speed * fx.calm * (1 + fx.warpV * fx.warpV * 40); // drift downward => feels like flying up
    for (let i = 0; i < count; i++) {
      const p = data[i];
      p.v -= sp * dt;
      if (p.v < -1) p.v += 2;
      positions[i * 3] = p.u * halfW;
      positions[i * 3 + 1] = p.v * halfH;
      positions[i * 3 + 2] = depth;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    const k = 0.12 * (depth + 12) / 12; // subtle parallax: nearer layers shift more
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, -pointer.current.x * k, 3, dt);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, pointer.current.y * k, 3, dt);
    matRef.current.opacity = 0.65 + (reduced ? 0 : twinkle * Math.sin(state.clock.elapsedTime * 1.6 + phase));
  });

  return <PointsCloud pointsRef={ref} matRef={matRef} count={count} positions={positions} sprite={sprite} color={color} size={size} />;
}

/** Runs first each frame: eases the shared "whoosh" and "calm" factors the other pieces read. */
function Controller() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const { scene } = sceneFx.get();
    fx.warpV = Math.max(0, fx.warpV - dt / 1.1);
    fx.calm = THREE.MathUtils.damp(fx.calm, scene === 'game' || scene === 'bee' ? CALM : 1, 2, dt);
  }, -1);
  return null;
}

/**
 * Keeps the demand-driven canvas drawing: full rate while something is moving (login, map, whoosh, burst, party),
 * ~30fps while calmly answering, nothing at all when motion is reduced (it redraws only when the page changes).
 */
function Ticker({ reduced, visible }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!visible) return undefined;
    const poke = () => invalidate();
    const offStore = sceneFx.subscribe(poke);
    window.addEventListener('scroll', poke, { passive: true, capture: true });
    window.addEventListener('resize', poke);
    let raf = 0;
    let last = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const s = sceneFx.get();
      const busy = s.scene === 'login' || s.scene === 'home' || s.popups > 0 || performance.now() < fx.busyUntil;
      if (t - last >= (busy ? 0 : 33) - 2) { last = t; invalidate(); }
    };
    if (reduced) poke(); else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); offStore();
      window.removeEventListener('scroll', poke, true);
      window.removeEventListener('resize', poke);
    };
  }, [reduced, visible, invalidate]);
  return null;
}

function Party({ reduced }) {
  const [wanted, setWanted] = useState(false);
  const celebrating = useSceneState((s) => s.celebrating);
  useEffect(() => { if (celebrating && !reduced) setWanted(true); }, [celebrating, reduced]);
  return wanted ? <Suspense fallback={null}><Celebration /></Suspense> : null;
}

export default function SpaceScene({ reduced, onReady, onFail }) {
  const visible = usePageVisible();
  useEffect(() => disposePlanetTextures, []);
  return (
    <Canvas
      className="!absolute inset-0"
      style={{ pointerEvents: 'none' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, CAM_Z], fov: FOV }}
      frameloop="demand"
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail?.(); });
        onReady?.();
      }}
    >
      <Controller />
      <Ticker reduced={reduced} visible={visible} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, -2, 3]} intensity={8} color="#a98bff" />
      <Nebula reduced={reduced} />
      <StarLayer count={90} depth={-9} size={0.07} speed={0.012} color="#9fb4ff" twinkle={0.2} phase={0} seed={11} reduced={reduced} />
      <StarLayer count={60} depth={-5} size={0.1} speed={0.025} color="#ffffff" twinkle={0.3} phase={2} seed={23} reduced={reduced} />
      <StarLayer count={30} depth={-2} size={0.16} speed={0.05} color="#b6f6ff" twinkle={0.35} phase={4} seed={37} reduced={reduced} />
      <LoginPlanet reduced={reduced} />
      <HomePlanet reduced={reduced} />
      <BeeScene reduced={reduced} />
      <MapPlanets reduced={reduced} />
      <Rocket reduced={reduced} />
      {!reduced && <Trail />}
      <Burst reduced={reduced} />
      <Party reduced={reduced} />
    </Canvas>
  );
}
