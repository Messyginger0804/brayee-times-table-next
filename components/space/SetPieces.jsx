"use client";
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { sceneFx } from '../../lib/sceneFx';
import { halfAt, useSprite } from './sprites';
import { planetTexture, ringTexture } from './planetTextures';

const LOGIN_Z = -2;

/** Where the login planet sits (world units at its depth). Phones: rising from the bottom edge, clear of the title; wide screens: right of the card. */
export function loginLayout(aspect, phone) {
  const { w, h } = halfAt(LOGIN_Z, aspect);
  if (phone) return { x: w * 0.12, y: -h * 0.97, z: LOGIN_Z, r: 0.8, orbit: 1.5 };
  return { x: w * 0.68, y: h * 0.02, z: LOGIN_Z, r: Math.min(1.3, h * 0.34), orbit: 1.75 };
}

/** Home: a distant planet on wide screens only (phones need the room for the map). */
function homeLayout(aspect, phone) {
  if (phone) return null;
  const { w, h } = halfAt(LOGIN_Z, aspect);
  return { x: -w * 0.82, y: -h * 0.25, z: LOGIN_Z, r: Math.min(0.7, h * 0.19) };
}

/** Additive soft glow disc around a body. */
export function Halo({ color, scale, opacity = 0.6 }) {
  const map = useSprite('dot');
  return (
    <sprite scale={[scale, scale, 1]}>
      <spriteMaterial map={map} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/** A glowing planet drifting in the background of one scene (login: ringed, with the orbiting rocket from Rocket.jsx). */
function DriftPlanet({ scene, layout, kind, ringy, halo, reduced }) {
  const { size } = useThree();
  const root = useRef();
  const spin = useRef();
  const L = layout(size.width / size.height, size.width < 640);
  const skin = useMemo(() => planetTexture(kind), [kind]);
  const ring = useMemo(() => (ringy ? ringTexture(0.7, ['#ffd1ef', '#a98bff', '#38f0ff', '#ffffff']) : null), [ringy]);
  useFrame((_, dt) => {
    root.current.visible = !!L && sceneFx.get().scene === scene;
    if (!reduced) spin.current.rotation.y += Math.min(dt, 0.05) * 0.12;
  });
  return (
    <group ref={root} position={L ? [L.x, L.y, L.z] : [0, 0, 0]} scale={L ? L.r : 1} visible={false}>
      <Float speed={reduced ? 0 : 1.2} floatIntensity={0.25} rotationIntensity={0.05}>
        <group rotation={[0.25, 0, -0.3]}>
          <mesh ref={spin}>
            <sphereGeometry args={[1, 40, 28]} />
            <meshStandardMaterial map={skin} emissiveMap={skin} emissive="#ffffff" emissiveIntensity={0.2} roughness={0.8} />
          </mesh>
          {ring && (
            <mesh rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
              <ringGeometry args={[1.4, 2, 72]} />
              <meshBasicMaterial map={ring} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          )}
        </group>
        <Halo color={halo} scale={4.6} opacity={0.4} />
        {!reduced && scene === 'login' && <Sparkles count={24} scale={[5, 3.5, 3]} size={2.5} speed={0.25} color="#b6f6ff" />}
      </Float>
    </group>
  );
}

export function LoginPlanet({ reduced }) {
  return <DriftPlanet scene="login" layout={loginLayout} kind={4} ringy halo="#ff5fd7" reduced={reduced} />;
}

export function HomePlanet({ reduced }) {
  return <DriftPlanet scene="home" layout={homeLayout} kind={0} ringy={false} halo="#ffb347" reduced={reduced} />;
}

const NEBULAE = [
  { color: '#6a3dff', x: -0.55, y: 0.35, s: 15, a: 0.2 },
  { color: '#18c7e8', x: 0.6, y: -0.4, s: 13, a: 0.15 },
  { color: '#ff3fb0', x: 0.1, y: 0.05, s: 10, a: 0.1 },
];
const NEBULA_Z = -9;

/** Big soft colour clouds far behind everything. Brighter behind popups and pickers, dimmer while playing. */
export function Nebula({ reduced }) {
  const { size } = useThree();
  const refs = useRef([]);
  const k = useRef(1);
  const { w, h } = halfAt(NEBULA_Z, size.width / size.height);
  useFrame((state, dt) => {
    const { popups, scene } = sceneFx.get();
    const goal = popups > 0 ? 4.5 : scene === 'game' || scene === 'bee' ? 0.5 : 1;
    k.current = THREE.MathUtils.damp(k.current, goal, 3, Math.min(dt, 0.05));
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = Math.min(0.85, NEBULAE[i].a * k.current);
      if (!reduced) m.rotation = state.clock.elapsedTime * 0.03 * (i + 1);
    });
  });
  return NEBULAE.map((n, i) => (
    <NebulaCloud key={n.color} cfg={n} x={n.x * w} y={n.y * h} matRef={(m) => { refs.current[i] = m; }} />
  ));
}

function NebulaCloud({ cfg, x, y, matRef }) {
  const map = useSprite('dot');
  return (
    <sprite position={[x, y, NEBULA_Z]} scale={[cfg.s, cfg.s, 1]}>
      <spriteMaterial ref={matRef} map={map} color={cfg.color} transparent opacity={cfg.a} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

const HEX_SPOTS = [
  [-1, 0.4, 0.2], [1, 0.12, 0.17], [-0.96, -0.25, 0.15], [0.97, -0.5, 0.22], [-0.9, -0.78, 0.16], [0.92, 0.62, 0.12], [-0.85, 0.72, 0.1],
];

/** Spelling Bee: honeycomb hexes floating at the edges and a bee buzzing across the top band. */
export function BeeScene({ reduced }) {
  const { size } = useThree();
  const root = useRef();
  const bee = useRef();
  const wings = useRef([]);
  const { w, h } = halfAt(-1, size.width / size.height);
  const top = halfAt(0.5, size.width / size.height).h * 0.66; // between the header and the title
  useFrame((state) => {
    root.current.visible = sceneFx.get().scene === 'bee';
    if (!root.current.visible || reduced) return;
    const t = state.clock.elapsedTime;
    bee.current.position.set(Math.sin(t * 0.5) * w * 0.4, top + Math.sin(t * 1.7) * 0.1, 0.5);
    bee.current.rotation.z = Math.cos(t * 0.5) * -0.25;
    bee.current.rotation.y = Math.cos(t * 0.5) > 0 ? 0 : Math.PI;
    wings.current.forEach((m, i) => { if (m) m.rotation.x = Math.sin(t * 60) * 0.6 * (i ? -1 : 1); });
  });
  return (
    <group ref={root}>
      {HEX_SPOTS.map(([fx, fy, s], i) => (
        <Float key={i} speed={reduced ? 0 : 1 + i * 0.15} floatIntensity={0.5} rotationIntensity={0.3}>
          <mesh position={[fx * w, fy * h, -1]} rotation={[Math.PI / 2 + 0.35, 0.2, i]} scale={s * 1.5}>
            <cylinderGeometry args={[1, 1, 0.28, 6]} />
            <meshStandardMaterial color="#d9a02a" emissive="#c9780f" emissiveIntensity={0.35} roughness={0.5} />
          </mesh>
        </Float>
      ))}
      <group ref={bee} position={[0, top, 0.5]} scale={0.15}>
        <BeeBody wings={wings} />
      </group>
    </group>
  );
}

function BeeBody({ wings }) {
  return (
    <>
      <mesh scale={[1.3, 0.9, 0.9]}>
        <sphereGeometry args={[0.6, 16, 12]} />
        <meshStandardMaterial color="#ffd23a" emissive="#ffb000" emissiveIntensity={0.4} />
      </mesh>
      {[-0.25, 0.2].map((x) => (
        <mesh key={x} position={[x, 0, 0]} scale={[0.22, 0.95, 0.95]}>
          <sphereGeometry args={[0.6, 12, 10]} />
          <meshStandardMaterial color="#1b1530" />
        </mesh>
      ))}
      <mesh position={[0.78, 0.1, 0]}>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshStandardMaterial color="#1b1530" />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => { wings.current[i] = m; }} position={[0, 0.55, i ? 0.35 : -0.35]}>
          <planeGeometry args={[0.7, 0.9]} />
          <meshBasicMaterial color="#cfeeff" transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
