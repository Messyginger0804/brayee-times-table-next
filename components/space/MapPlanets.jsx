"use client";
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fx, sceneFx, useSceneState } from '../../lib/sceneFx';
import { CAM_Z, TAN } from './sprites';
import { Halo } from './SetPieces';
import { LOCKED_KIND, PLANET_KINDS, planetTexture, ringTexture } from './planetTextures';

const GEO = new THREE.SphereGeometry(1, 32, 22);
const LOCKED = '#6a7088';
const now = () => performance.now();

/** Squash-and-stretch after a tap, decaying fast. */
function tapBounce(id) {
  if (fx.tap?.id !== id) return 0;
  const s = (now() - fx.tap.t) / 1000;
  return s > 0.8 ? 0 : 0.3 * Math.exp(-5 * s) * Math.cos(16 * s);
}

/** 0..1 progress of the zoom-in whoosh for this planet. */
function warpProgress(id) {
  if (fx.warp?.id !== id) return 0;
  return Math.min(1, (now() - fx.warp.t) / 420);
}

/** Put the planet over its slot rect `r`; during the whoosh (`e` 0..1) it drifts to the centre and swells. */
function placePlanet(g, r, size, wpp, { id, state, beat, e }) {
  const hov = fx.hover === id && state !== 'locked' ? 0.14 : 0;
  const px = r.left + r.width / 2, py = r.top + r.height / 2;
  g.position.set((px - size.width / 2) * wpp * (1 - e), -(py - size.height / 2) * wpp * (1 - e), e * 1.5);
  g.scale.setScalar((r.width / 2) * wpp * 0.94 * beat * (1 + hov + tapBounce(id) + e * 3.5));
}

/** One 3D planet drawn over its DOM slot. The slot rect is re-read every frame, so scrolling and page transitions just work. */
function MapPlanet({ id, state, kind, reduced }) {
  const group = useRef();
  const body = useRef();
  const halo = useRef();
  const moons = useRef();
  const { size } = useThree();
  const pulse = state === 'current';
  const skin = useMemo(() => planetTexture(state === 'locked' ? LOCKED_KIND : kind % LOCKED_KIND), [kind, state]);
  const k = PLANET_KINDS[kind % LOCKED_KIND];
  const ring = useMemo(() => (state === 'mastered' ? ringTexture(0.7, ['#d8ffb0', '#ffe27a', '#ffffff']) : null), [state]);
  useEffect(() => () => ring?.dispose(), [ring]); // R3F frees the material, not textures passed to `map`
  const wpp = (2 * CAM_Z * TAN) / size.height; // world units per CSS pixel on the z=0 plane

  useFrame((s, dt) => {
    const r = sceneFx.planets.get(id)?.el?.getBoundingClientRect();
    const g = group.current;
    g.visible = !!r && r.width > 0 && r.bottom > -40 && r.top < size.height + 40;
    if (!g.visible) return;
    const t = reduced ? 0 : s.clock.elapsedTime;
    const w = warpProgress(id);
    placePlanet(g, r, size, wpp, { id, state, beat: pulse ? 1 + Math.sin(t * 3) * 0.05 : 1, e: w * w });
    body.current.rotation.y += Math.min(dt, 0.05) * (pulse ? 0.55 : 0.25) * (reduced ? 0 : 1 + w * 8);
    if (halo.current) halo.current.visible = state !== 'locked';
    if (moons.current) moons.current.rotation.y = t * 1.1;
  });

  return (
    <group ref={group} visible={false}>
      <group rotation={[0.3, 0, -0.35]}>
        <mesh ref={body} geometry={GEO}>
          <PlanetMaterial skin={skin} state={state} />
        </mesh>
        {ring && <MapRing ring={ring} />}
      </group>
      <group ref={halo}>
        <Halo {...haloLook(state, k.halo)} />
      </group>
      {state === 'mastered' && <Moons moons={moons} />}
    </group>
  );
}

function PlanetMaterial({ skin, state }) {
  const locked = state === 'locked';
  return (
    <meshStandardMaterial map={skin} emissiveMap={skin} emissive={locked ? '#000000' : '#ffffff'}
      emissiveIntensity={EMISSIVE[state] ?? 0.3} color={locked ? LOCKED : '#ffffff'} roughness={0.85} />
  );
}

const EMISSIVE = { current: 0.55, mastered: 0.45 };

function haloLook(state, tint) {
  if (state === 'current') return { color: '#ffc531', scale: 3.6, opacity: 0.55 };
  return { color: state === 'mastered' ? '#b8ff5a' : tint, scale: 3, opacity: 0.32 };
}

function MapRing({ ring }) {
  return (
    <mesh rotation={[-Math.PI / 2 + 0.1, 0, 0]}>
      <ringGeometry args={[1.3, 1.62, 48]} />
      <meshBasicMaterial map={ring} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Moons({ moons }) {
  return (
    <group ref={moons} rotation={[0.5, 0, 0.2]}>
      <Moon x={1.45} s={0.2} color="#ffffff" />
      <Moon x={-1.4} s={0.14} color="#ffd75e" />
    </group>
  );
}

function Moon({ x, s, color }) {
  return (
    <mesh position={[x, 0, 0]} scale={s} geometry={GEO}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
    </mesh>
  );
}

/** Every mission-map planet registered by the page. Rendered only while a map is on screen. */
export default function MapPlanets({ reduced }) {
  useSceneState((s) => s.version);
  const entries = [...sceneFx.planets.entries()];
  return entries.map(([id, p]) => <MapPlanet key={id} id={id} state={p.state} kind={p.kind} reduced={reduced} />);
}
