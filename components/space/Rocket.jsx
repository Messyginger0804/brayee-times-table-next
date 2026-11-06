"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { gameFx } from '../../lib/gameFx';
import { fx, sceneFx } from '../../lib/sceneFx';
import { PointsCloud, useSprite } from './sprites';
import { loginLayout } from './SetPieces';

// Shared between Rocket (writes) and Burst / Trail (read); module-level avoids React re-renders.
const rocketPos = { x: 0, y: 0, dx: 0, dy: 1, scale: 0.2 };

const now = () => performance.now();

/** Where the climbing rocket sits for this correct-answer count; phones keep it in the top band, clear of the question and keypad. */
function climbTarget(correct, vw, vh, phone, scale) {
  const climb = 1 - Math.exp(-correct / 6); // asymptotic: always moves a bit, never leaves
  const yMin = phone ? vh / 2 - vh * 0.2 : -vh / 2 + scale * 2.2;
  const yMax = phone ? vh / 2 - vh * 0.085 : vh / 2 - scale * 3.2;
  return { x: vw / 2 - Math.max(0.2, scale * 1.2), y: yMin + (yMax - yMin) * climb };
}

/** Rocket circling the login planet on a tilted ellipse. Returns heading angle. */
function orbitAt(g, t, aspect, phone) {
  const L = loginLayout(aspect, phone);
  const a = t * 0.7;
  const rx = L.r * L.orbit, ry = L.r * 0.5;
  g.position.set(L.x + Math.cos(a) * rx, L.y + Math.sin(a) * ry + Math.cos(a) * L.r * 0.25, L.z + Math.sin(a) * L.r * 1.7);
  return Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx) - Math.PI / 2;
}

function useRocketEvents(thrust, wobble, boost) {
  const last = useRef(gameFx.getState());
  useEffect(() => {
    const off = gameFx.subscribe(() => {
      const s = gameFx.getState();
      if (s.correct !== last.current.correct) thrust.current = 1;
      if (s.wrong !== last.current.wrong) wobble.current = 1;
      last.current = s;
    });
    const offEv = gameFx.on((e) => {
      if (e.type === 'streak') { boost.current = 1; sceneFx.busy(2600); }
      if (e.type === 'mastered') { fx.launch = now(); sceneFx.busy(2600); }
    });
    return () => { off(); offEv(); };
  }, [thrust, wobble, boost]);
}

export default function Rocket({ reduced }) {
  const group = useRef();
  const flame = useRef();
  const thrust = useRef(0);
  const wobble = useRef(0);
  const boost = useRef(0);
  const { viewport, size } = useThree();
  useRocketEvents(thrust, wobble, boost);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { scene } = sceneFx.get();
    const g = group.current;
    g.visible = scene !== 'home';
    if (!g.visible) return;
    const phone = size.width < 640;
    const t = state.clock.elapsedTime;
    thrust.current = Math.max(0, thrust.current - dt * 1.6);
    wobble.current = Math.max(0, wobble.current - dt * 1.4);
    boost.current = Math.max(0, boost.current - dt / 2);
    let head = 0;
    if (scene === 'login') {
      g.scale.setScalar(phone ? 0.2 : 0.3);
      head = orbitAt(g, reduced ? 0.9 : t, size.width / size.height, phone);
      g.rotation.z = head;
    } else {
      const scale = (phone ? THREE.MathUtils.clamp(viewport.height * 0.03, 0.12, 0.24) : THREE.MathUtils.clamp(viewport.height * 0.04, 0.14, 0.32)) * (1 + boost.current * 0.35);
      const tg = climbTarget(gameFx.getState().correct, viewport.width, viewport.height, phone, scale);
      g.scale.setScalar(scale);
      g.position.x = tg.x;
      g.position.z = 0;
      g.position.y = THREE.MathUtils.damp(g.position.y, tg.y, 2.2, dt);
      launchLift(g, viewport.height);
      g.rotation.z = -0.25 + Math.sin(t * 28) * 0.01 * thrust.current + Math.sin(wobble.current * 14) * 0.18 * wobble.current;
      head = g.rotation.z;
    }
    rocketPos.x = g.position.x; rocketPos.y = g.position.y; rocketPos.scale = g.scale.x;
    rocketPos.dx = -Math.sin(head); rocketPos.dy = Math.cos(head);
    const power = Math.max(thrust.current, boost.current, scene === 'login' ? 0.35 : 0);
    const f = 1 + power * 1.4 + Math.sin(t * 30) * 0.12;
    flame.current.scale.set(1, f, 1);
    flame.current.position.y = -1.55 - (f - 1) * 0.35;
  });

  return (
    <group ref={group}>
      <Float speed={reduced ? 0 : 2} rotationIntensity={0.15} floatIntensity={0.35}>
        <RocketBody flameRef={flame} />
      </Float>
    </group>
  );
}

/** Mastery: the rocket blasts off the top, then glides back in from below. */
function launchLift(g, vh) {
  if (!fx.launch) return;
  const p = (now() - fx.launch) / 1800;
  if (p >= 1) { fx.launch = 0; g.position.y = -vh / 2 - 1; return; }
  g.position.y += p * p * vh * 1.6;
}

function RocketBody({ flameRef }) {
  const body = '#f4f7ff';
  return (
    <>
      <mesh>
        <cylinderGeometry args={[0.5, 0.5, 2, 16]} />
        <meshStandardMaterial color={body} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[0.5, 1.1, 16]} />
        <meshStandardMaterial color="#ff5fd7" emissive="#ff5fd7" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.35, 0.42]}>
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color="#38f0ff" emissive="#38f0ff" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.515, 0.515, 0.22, 16]} />
        <meshStandardMaterial color="#ffc531" emissive="#ffc531" emissiveIntensity={0.3} />
      </mesh>
      {[0, 120, 240].map((deg) => (
        <group key={deg} rotation={[0, (deg * Math.PI) / 180, 0]}>
          <mesh position={[0.62, -0.85, 0]} rotation={[0, 0, -0.35]}>
            <boxGeometry args={[0.5, 0.9, 0.08]} />
            <meshStandardMaterial color="#a98bff" emissive="#a98bff" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.28, 0.4, 0.3, 12]} />
        <meshStandardMaterial color="#59627f" />
      </mesh>
      <mesh ref={flameRef} position={[0, -1.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 1, 10]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.9} />
      </mesh>
    </>
  );
}

/** Glowing particle trail behind the rocket while a streak boost (or a launch) is on. Ring buffer of N points. */
export function Trail() {
  const N = 40;
  const ref = useRef();
  const sprite = useSprite('dot');
  const d = useMemo(() => ({
    pos: new Float32Array(N * 3).fill(9999), col: new Float32Array(N * 3), age: new Float32Array(N).fill(9), vel: new Float32Array(N * 2), head: 0, acc: 0, until: 0,
  }), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    emitTrail(d, dt, N);
    ageTrail(d, dt, N);
    const g = ref.current.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  });

  useEffect(() => gameFx.on((e) => { if (e.type === 'streak') d.until = now() + 2000; if (e.type === 'mastered') d.until = now() + 1800; }), [d]);

  return <PointsCloud pointsRef={ref} count={N} positions={d.pos} colors={d.col} sprite={sprite} color="#ffffff" size={0.22} additive />;
}

function emitTrail(d, dt, N) {
  if (!d.until || now() > d.until) return;
  d.acc += dt * 45;
  while (d.acc >= 1) {
    d.acc -= 1;
    const i = d.head; d.head = (d.head + 1) % N;
    const back = rocketPos.scale * 1.9;
    d.pos[i * 3] = rocketPos.x - rocketPos.dx * back + (Math.random() - 0.5) * 0.08;
    d.pos[i * 3 + 1] = rocketPos.y - rocketPos.dy * back + (Math.random() - 0.5) * 0.08;
    d.pos[i * 3 + 2] = -0.1;
    d.vel[i * 2] = -rocketPos.dx * 0.5 + (Math.random() - 0.5) * 0.4;
    d.vel[i * 2 + 1] = -rocketPos.dy * 0.5 + (Math.random() - 0.5) * 0.4;
    d.age[i] = 0;
  }
}

function ageTrail(d, dt, N) {
  for (let i = 0; i < N; i++) {
    d.age[i] += dt;
    const life = Math.max(0, 1 - d.age[i] / 0.9);
    d.pos[i * 3] += d.vel[i * 2] * dt;
    d.pos[i * 3 + 1] += d.vel[i * 2 + 1] * dt;
    d.col[i * 3] = life; d.col[i * 3 + 1] = life * 0.62; d.col[i * 3 + 2] = life * 0.22; // orange fading to black (additive)
  }
}

/** Star-shaped particle pop at the rocket whenever a correct answer happens. */
export function Burst({ reduced }) {
  const N = reduced ? 10 : 22;
  const ref = useRef();
  const matRef = useRef();
  const life = useRef(0);
  const vel = useMemo(() => new Float32Array(N * 3), [N]);
  const positions = useMemo(() => new Float32Array(N * 3).fill(9999), [N]);
  const sprite = useSprite('star');
  const lastBurst = useRef(gameFx.getState().burst);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = gameFx.getState();
    if (s.burst !== lastBurst.current) {
      lastBurst.current = s.burst;
      spawnBurst(positions, vel, N);
      life.current = 1;
      sceneFx.busy(1200);
    }
    if (life.current > 0) {
      life.current = Math.max(0, life.current - dt / 0.9);
      stepBurst(positions, vel, N, dt);
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

function spawnBurst(positions, vel, N) {
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.4;
    const sp = 0.8 + Math.random() * 1.6;
    vel[i * 3] = Math.cos(a) * sp;
    vel[i * 3 + 1] = Math.sin(a) * sp + 0.6;
    positions[i * 3] = rocketPos.x;
    positions[i * 3 + 1] = rocketPos.y + 0.4;
    positions[i * 3 + 2] = 0.5;
  }
}

function stepBurst(positions, vel, N, dt) {
  for (let i = 0; i < N; i++) {
    vel[i * 3 + 1] -= 1.6 * dt;
    positions[i * 3] += vel[i * 3] * dt;
    positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
  }
}
