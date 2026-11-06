"use client";
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fx } from '../../lib/sceneFx';
import { rng } from './sprites';

const LIFE = 2.3; // seconds
const CONFETTI = 90;
const COLORS = ['#ff5fd7', '#ffc531', '#38f0ff', '#b8ff5a', '#a98bff', '#ff6a5a'];
const CUP = [[0, 0], [0.45, 0.05], [0.5, 0.2], [0.18, 0.35], [0.14, 0.7], [0.5, 0.78], [0.62, 1.5], [0.55, 1.62], [0, 1.62]];

const elapsed = () => (fx.celebrate ? (performance.now() - fx.celebrate.t) / 1000 : 99);

/** Trophy from a lathe profile + two torus handles. Rises, spins, then shrinks away. */
function Trophy({ vh }) {
  const g = useRef();
  const profile = useMemo(() => CUP.map(([x, y]) => new THREE.Vector2(x, y)), []);
  useFrame(() => {
    const t = elapsed();
    g.current.visible = t < LIFE;
    if (!g.current.visible) return;
    const rise = 1 - Math.pow(1 - Math.min(1, t / 0.7), 3);
    const out = t > LIFE - 0.4 ? (LIFE - t) / 0.4 : 1;
    g.current.position.set(0, -vh * 0.55 + rise * vh * 0.97, 1);
    g.current.rotation.y = t * 3.2;
    g.current.scale.setScalar(Math.max(0.001, vh * 0.07 * out * (0.8 + 0.2 * rise)));
  });
  return (
    <group ref={g} visible={false}>
      <group position={[0, -0.8, 0]}>
        <mesh>
          <latheGeometry args={[profile, 24]} />
          <meshStandardMaterial color="#ffc531" emissive="#ff9d1a" emissiveIntensity={0.55} roughness={0.3} metalness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.62, 1.1, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.3, 0.07, 8, 16]} />
            <meshStandardMaterial color="#ffc531" emissive="#ff9d1a" emissiveIntensity={0.55} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.9, 0.2, 0.9]} />
          <meshStandardMaterial color="#a98bff" emissive="#a98bff" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** Instanced confetti falling from above the top edge. */
function Confetti({ vw, vh }) {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: CONFETTI }, () => ({ x: r() * 2 - 1, d: r() * 0.7, v: 0.55 + r() * 0.5, spin: 2 + r() * 6, ph: r() * 6 }));
  }, []);
  const colors = useMemo(() => {
    const c = new Float32Array(CONFETTI * 3);
    const col = new THREE.Color();
    for (let i = 0; i < CONFETTI; i++) { col.set(COLORS[i % COLORS.length]); col.toArray(c, i * 3); }
    return c;
  }, []);

  useFrame(() => {
    const t = elapsed();
    mesh.current.visible = t < LIFE;
    if (!mesh.current.visible) return;
    mesh.current.count = fx.celebrate.kind === 'mastered' ? CONFETTI : 60;
    seeds.forEach((p, i) => {
      const a = Math.max(0, t - p.d);
      dummy.position.set(p.x * vw * 0.5 + Math.sin(a * 3 + p.ph) * 0.15, vh * 0.56 - a * p.v * vh * 0.62, 1.2);
      dummy.rotation.set(a * p.spin, a * p.spin * 0.7, a * p.spin * 0.5);
      dummy.scale.setScalar(a > 0 ? Math.min(vh, 5) * 0.026 : 0.0001);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, CONFETTI]} frustumCulled={false} visible={false}>
      <boxGeometry args={[1, 0.6, 0.1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colors, 3]} />
      </boxGeometry>
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}

/** ~2s trophy + confetti party for level-ups and mastery (the rocket launch itself lives in Rocket.jsx). */
export default function Celebration() {
  const { viewport } = useThree();
  return (
    <>
      <Trophy vh={viewport.height} />
      <Confetti vw={viewport.width} vh={viewport.height} />
    </>
  );
}
