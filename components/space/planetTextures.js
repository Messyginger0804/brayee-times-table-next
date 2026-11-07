import * as THREE from 'three';
import { rng } from './sprites';

// Procedural planet skins drawn on a small canvas: no downloads, ~130KB of pixels each, built on first use.
/** Grey cratered rock is last: it is the skin for locked planets, so open missions never use it. */
export const LOCKED_KIND = 7;
export const PLANET_KINDS = [
  { type: 'bands', base: '#e8a35c', accents: ['#f7d9a0', '#c9742f', '#fbe9c4', '#a85a22'], halo: '#ffb347' },
  { type: 'ocean', base: '#2a6fdb', accents: ['#3fbf6b', '#e8f6ff', '#1f9d55'], halo: '#38f0ff' },
  { type: 'mars', base: '#d9503a', accents: ['#8f2a1f', '#f08a62', '#fff0e6'], halo: '#ff7a59' },
  { type: 'ice', base: '#bfeaff', accents: ['#ffffff', '#7fd0f5', '#5aa9e6'], halo: '#8fe3ff' },
  { type: 'candy', base: '#ff7ac8', accents: ['#a98bff', '#ffd1ef', '#ff4fb0'], halo: '#ff5fd7' },
  { type: 'lava', base: '#2a1a2e', accents: ['#ff6a1a', '#ffb347'], halo: '#ff8a3d' },
  { type: 'toxic', base: '#6fd14a', accents: ['#b9f27a', '#3f9b2a', '#a98bff'], halo: '#b6ff6a' },
  { type: 'craters', base: '#b9b4c8', accents: ['#8a849c', '#d8d3e6'], halo: '#cfd8ff' },
];

const W = 256;
const H = 128;

function bands(g, p, r) {
  for (let y = 0; y < H; y += 6 + r() * 12) {
    g.fillStyle = p.accents[Math.floor(r() * p.accents.length)];
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3);
    g.lineTo(W, y + 5 + r() * 8);
    g.lineTo(0, y + 5 + r() * 8);
    g.fill();
  }
}

function blobs(g, p, r, n, rad) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = p.accents[Math.floor(r() * p.accents.length)];
    g.globalAlpha = 0.8;
    const x = r() * W, y = r() * H, s = rad * (0.5 + r());
    for (const dx of [-W, 0, W]) { g.beginPath(); g.ellipse(x + dx, y, s * 1.4, s, r() * 3, 0, 7); g.fill(); }
  }
}

function craters(g, p, r) {
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H, s = 3 + r() * 11;
    g.globalAlpha = 0.7;
    g.fillStyle = p.accents[0];
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.strokeStyle = p.accents[1]; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x - 1, y - 1, s, 0, 7); g.stroke();
  }
}

function candy(g, p, r) {
  for (let i = -H; i < W + H; i += 14) {
    g.strokeStyle = p.accents[(i / 14 + 64) % p.accents.length | 0];
    g.globalAlpha = 0.85; g.lineWidth = 6 + r() * 4;
    g.beginPath(); g.moveTo(i, 0);
    for (let y = 0; y <= H; y += 16) g.lineTo(i + y * 0.6 + Math.sin(y * 0.1 + i) * 5, y);
    g.stroke();
  }
}

function cracks(g, p, r) {
  g.lineWidth = 2.5;
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = p.accents[i % 2]; g.globalAlpha = 0.95;
    g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 30; g.lineTo(x, y); }
    g.stroke();
  }
}

const PAINT = {
  bands, craters, candy, lava: cracks,
  ocean: (g, p, r) => blobs(g, p, r, 22, 12),
  mars: (g, p, r) => blobs(g, p, r, 18, 10),
  toxic: (g, p, r) => blobs(g, p, r, 24, 8),
  ice: (g, p, r) => { bands(g, p, r); cracks(g, { accents: [p.accents[0], p.accents[2]] }, r); },
};

const cache = new Map();

/** Cached CanvasTexture for planet kind index `i` (wraps). */
export function planetTexture(i) {
  const k = PLANET_KINDS[i % PLANET_KINDS.length];
  if (cache.has(k.type)) return cache.get(k.type);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = k.base; g.fillRect(0, 0, W, H);
  PAINT[k.type](g, k, rng(7 + i * 31));
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(k.type, t);
  return t;
}

export function disposePlanetTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

/** Ring skin: concentric translucent bands inside a square (RingGeometry UVs are planar). */
export function ringTexture(inner, colors) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = rng(5);
  for (let rad = 64; rad > inner * 64; rad -= 2) {
    g.strokeStyle = colors[Math.floor(r() * colors.length)];
    g.globalAlpha = 0.35 + r() * 0.5;
    g.lineWidth = 2.4;
    g.beginPath(); g.arc(64, 64, rad - 1, 0, 7); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
