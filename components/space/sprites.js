import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export const CAM_Z = 5;
export const FOV = 55;
export const TAN = Math.tan((FOV * Math.PI) / 360);

/** Visible half-size of the view on the plane at depth z. */
export const halfAt = (z, aspect) => {
  const h = (CAM_Z - z) * TAN;
  return { w: h * aspect, h };
};

// Deterministic pseudo random so layouts are stable between renders
export function rng(seed) {
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
  return new THREE.CanvasTexture(c);
}

/** Sprite texture created once per kind and disposed on unmount. */
export function useSprite(kind) {
  const sprite = useMemo(() => makeSprite(kind), [kind]);
  useEffect(() => () => sprite.dispose(), [sprite]);
  return sprite;
}

/** Dynamic-position THREE.Points shared by the star layers, burst and trail. */
export function PointsCloud({ pointsRef, matRef, count, positions, colors, sprite, color, size, visible = true, additive = false }) {
  return (
    <points ref={pointsRef} frustumCulled={false} visible={visible}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} usage={THREE.DynamicDrawUsage} />
        {colors && <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} usage={THREE.DynamicDrawUsage} />}
      </bufferGeometry>
      <pointsMaterial ref={matRef} map={sprite} color={color} size={size} sizeAttenuation transparent depthWrite={false} alphaTest={0.01}
        vertexColors={!!colors} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} />
    </points>
  );
}
