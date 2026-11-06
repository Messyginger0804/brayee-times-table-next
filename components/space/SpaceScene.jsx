"use client";
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { gameFx } from '../../lib/gameFx';
import { usePageVisible } from './useSpaceEnv';

// Shared between Rocket (writes) and Burst (reads); module-level avoids React re-renders.
const rocketPos = { x: 0, y: 0 };

const CAM_Z = 5;
const FOV = 55;
const TAN = Math.tan((FOV * Math.PI) / 360);

// Deterministic pseudo random so layouts are stable between renders
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Soft round/star sprite drawn once on a tiny canvas (no image files). */
function makeSprite(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (kind === 'star') {
    g.translate(32, 32);
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 11 : 28;
      const a = (Math.PI * i) / 5 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

/** Sprite texture created once per kind and disposed on unmount. */
function useSprite(kind) {
  const sprite = useMemo(() => makeSprite(kind), [kind]);
  useEffect(() => () => sprite.dispose(), [sprite]);
  return sprite;
}

/** Dynamic-position THREE.Points shared by the star layers and the burst. */
function PointsCloud({ pointsRef, matRef, count, positions, sprite, color, size, visible = true }) {
  return (
    <points ref={pointsRef} frustumCulled={false} visible={visible}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} map={sprite} color={color} size={size} sizeAttenuation transparent depthWrite={false} alphaTest={0.01} />
    </points>
  );
}

/** One parallax layer of points. Positions are stored as normalized (u,v) and mapped to the visible frustum. */
function StarLayer({ count, depth, size, speed, color, twinkle, phase, seed }) {
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
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const halfH = (CAM_Z - depth) * TAN;
    const halfW = halfH * aspect;
    for (let i = 0; i < count; i++) {
      const p = data[i];
      p.v -= speed * dt; // drift downward => feels like flying up
      if (p.v < -1) p.v += 2;
      positions[i * 3] = p.u * halfW;
      positions[i * 3 + 1] = p.v * halfH;
      positions[i * 3 + 2] = depth;
    }
    const geo = ref.current.geometry;
    geo.attributes.position.needsUpdate = true;
    // subtle parallax: nearer layers shift more
    const k = 0.12 * (depth + 12) / 12;
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, -pointer.current.x * k, 3, dt);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, pointer.current.y * k, 3, dt);
    // twinkle
    matRef.current.opacity = 0.65 + twinkle * Math.sin(state.clock.elapsedTime * 1.6 + phase);
  });

  return (
    <PointsCloud pointsRef={ref} matRef={matRef} count={count} positions={positions} sprite={sprite} color={color} size={size} />
  );
}

/** Rocket from primitives only. */
function Rocket({ reduced }) {
  const group = useRef();
  const flame = useRef();
  const thrust = useRef(0);
  const wobble = useRef(0);
  const target = useRef(0);
  const last = useRef(gameFx.getState());
  const { viewport, size } = useThree();

  useEffect(() => {
    return gameFx.subscribe(() => {
      const s = gameFx.getState();
      if (s.correct !== last.current.correct) thrust.current = 1;
      if (s.wrong !== last.current.wrong) wobble.current = 1;
      last.current = s;
    });
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = gameFx.getState();
    const climb = 1 - Math.exp(-s.correct / 6); // asymptotic: always moves a bit, never leaves
    const vw = viewport.width, vh = viewport.height;
    // Phones (portrait): the question and keypad span the full width, so the rocket stays in the top band
    // (beside the header / stats / astronaut row) and never flies behind them.
    const phone = size.width < 640;
    const scale = phone ? THREE.MathUtils.clamp(vh * 0.03, 0.12, 0.24) : THREE.MathUtils.clamp(vh * 0.04, 0.14, 0.32);
    const x = vw / 2 - Math.max(0.2, scale * 1.2);
    const yMin = phone ? vh / 2 - vh * 0.2 : -vh / 2 + scale * 2.2;
    const yMax = phone ? vh / 2 - vh * 0.085 : vh / 2 - scale * 3.2;
    target.current = yMin + (yMax - yMin) * climb;
    const g = group.current;
    g.scale.setScalar(scale);
    g.position.x = x;
    g.position.y = THREE.MathUtils.damp(g.position.y, target.current, 2.2, dt);
    rocketPos.x = g.position.x;
    rocketPos.y = g.position.y;
    thrust.current = Math.max(0, thrust.current - dt * 1.6);
    wobble.current = Math.max(0, wobble.current - dt * 1.4);
    g.rotation.z = -0.25 + Math.sin(state.clock.elapsedTime * 28) * 0.01 * thrust.current
      + Math.sin(wobble.current * 14) * 0.18 * wobble.current;
    const f = 1 + thrust.current * 1.4 + Math.sin(state.clock.elapsedTime * 30) * 0.12;
    flame.current.scale.set(1, f, 1);
    flame.current.position.y = -1.55 - (f - 1) * 0.35;
  });

  const body = '#f4f7ff';
  return (
    <group ref={group}>
      <Float speed={reduced ? 0 : 2} rotationIntensity={0.15} floatIntensity={0.35}>
        {/* fuselage */}
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 2, 16]} />
          <meshStandardMaterial color={body} roughness={0.4} metalness={0.1} />
        </mesh>
        {/* nose */}
        <mesh position={[0, 1.55, 0]}>
          <coneGeometry args={[0.5, 1.1, 16]} />
          <meshStandardMaterial color="#ff5fd7" emissive="#ff5fd7" emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
        {/* window */}
        <mesh position={[0, 0.35, 0.42]}>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color="#38f0ff" emissive="#38f0ff" emissiveIntensity={0.9} />
        </mesh>
        {/* stripe */}
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[0.515, 0.515, 0.22, 16]} />
          <meshStandardMaterial color="#ffc531" emissive="#ffc531" emissiveIntensity={0.3} />
        </mesh>
        {/* fins */}
        {[0, 120, 240].map((deg) => (
          <group key={deg} rotation={[0, (deg * Math.PI) / 180, 0]}>
            <mesh position={[0.62, -0.85, 0]} rotation={[0, 0, -0.35]}>
              <boxGeometry args={[0.5, 0.9, 0.08]} />
              <meshStandardMaterial color="#a98bff" emissive="#a98bff" emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
        {/* nozzle */}
        <mesh position={[0, -1.1, 0]}>
          <cylinderGeometry args={[0.28, 0.4, 0.3, 12]} />
          <meshStandardMaterial color="#59627f" />
        </mesh>
        {/* flame */}
        <mesh ref={flame} position={[0, -1.55, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.28, 1, 10]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
        </mesh>
      </Float>
    </group>
  );
}

/** Star-shaped particle pop at the rocket whenever a correct answer happens. */
function Burst({ reduced }) {
  const N = reduced ? 10 : 22;
  const ref = useRef();
  const matRef = useRef();
  const life = useRef(0);
  const origin = useRef(new THREE.Vector3());
  const vel = useMemo(() => new Float32Array(N * 3), [N]);
  const positions = useMemo(() => new Float32Array(N * 3).fill(9999), [N]);
  const sprite = useSprite('star');
  const lastBurst = useRef(gameFx.getState().burst);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = gameFx.getState();
    if (s.burst !== lastBurst.current) {
      lastBurst.current = s.burst;
      origin.current.set(rocketPos.x, rocketPos.y + 0.4, 0.5);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + Math.random() * 0.4;
        const sp = 0.8 + Math.random() * 1.6;
        vel[i * 3] = Math.cos(a) * sp;
        vel[i * 3 + 1] = Math.sin(a) * sp + 0.6;
        vel[i * 3 + 2] = 0;
        positions[i * 3] = origin.current.x;
        positions[i * 3 + 1] = origin.current.y;
        positions[i * 3 + 2] = origin.current.z;
      }
      life.current = 1;
    }
    if (life.current > 0) {
      life.current = Math.max(0, life.current - dt / 0.9);
      for (let i = 0; i < N; i++) {
        vel[i * 3 + 1] -= 1.6 * dt;
        positions[i * 3] += vel[i * 3] * dt;
        positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
      matRef.current.opacity = life.current;
      ref.current.visible = life.current > 0;
    } else if (ref.current.visible) {
      ref.current.visible = false;
    }
  });

  return (
    <PointsCloud pointsRef={ref} matRef={matRef} count={N} positions={positions} sprite={sprite} color="#ffd75e" size={0.28} visible={false} />
  );
}

export default function SpaceScene({ onReady, onFail }) {
  const visible = usePageVisible();
  const reduced = false; // the scene is not mounted at all when reduced-motion is on
  return (
    <Canvas
      className="!absolute inset-0"
      style={{ pointerEvents: 'none' }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, CAM_Z], fov: FOV }}
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail?.(); });
        onReady?.();
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, -2, 3]} intensity={8} color="#a98bff" />
      <StarLayer count={90} depth={-9} size={0.07} speed={0.012} color="#9fb4ff" twinkle={0.2} phase={0} seed={11} />
      <StarLayer count={60} depth={-5} size={0.1} speed={0.025} color="#ffffff" twinkle={0.3} phase={2} seed={23} />
      <StarLayer count={30} depth={-2} size={0.16} speed={0.05} color="#b6f6ff" twinkle={0.35} phase={4} seed={37} />
      <Rocket reduced={reduced} />
      <Burst reduced={reduced} />
    </Canvas>
  );
}
