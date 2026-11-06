import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerFireworks } from '../../lib/fireworks';

// No DOM library in this repo: stub just the browser surface fireworks touches.
function setup({ dpr } = {}) {
  const ctx = { clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), globalAlpha: 1, fillStyle: '' };
  const canvas = { style: {}, width: 0, height: 0, getContext: vi.fn(() => ctx) };
  const body = { appendChild: vi.fn(), removeChild: vi.fn() };
  const listeners = {};
  const frames = [];
  vi.stubGlobal('window', {
    devicePixelRatio: dpr, innerWidth: 1000, innerHeight: 500,
    addEventListener: vi.fn((ev, fn, opts) => { listeners[ev] = { fn, opts }; }),
  });
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas), body });
  vi.stubGlobal('performance', { now: () => 0 });
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => { frames.push(cb); return frames.length; }));
  return { ctx, canvas, body, listeners, frames };
}

beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.5));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('triggerFireworks', () => {
  it('mounts a click-through overlay sized to the viewport times devicePixelRatio', () => {
    const { canvas, body } = setup({ dpr: 2 });
    triggerFireworks();
    expect(body.appendChild).toHaveBeenCalledWith(canvas);
    expect(canvas.style).toMatchObject({ position: 'fixed', pointerEvents: 'none', zIndex: 9998 });
    expect([canvas.width, canvas.height]).toEqual([2000, 1000]);
  });
  it('dpr falls back to 1 when missing or below 1', () => {
    const a = setup({ dpr: undefined });
    triggerFireworks();
    expect(a.canvas.width).toBe(1000);
    const b = setup({ dpr: 0.5 });
    triggerFireworks();
    expect(b.canvas.width).toBe(1000);
  });
  it('draws particles (3 bursts of particles/3) each frame until the duration elapses, then removes the canvas', () => {
    const { ctx, body, frames } = setup({ dpr: 1 });
    triggerFireworks({ duration: 1000, particles: 30 });
    expect(frames).toHaveLength(1);
    frames.shift()(500); // halfway
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledTimes(30);
    expect(body.removeChild).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1); // scheduled the next frame
    frames.shift()(1000); // done
    expect(body.removeChild).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
    expect(ctx.globalAlpha).toBe(1);
  });
  it('defaults to 120 particles over 1200ms', () => {
    const { ctx, frames } = setup({ dpr: 1 });
    triggerFireworks();
    frames.shift()(100);
    expect(ctx.arc).toHaveBeenCalledTimes(120);
    frames.shift()(1200);
    expect(frames).toHaveLength(0);
  });
  it('resizes the canvas once on window resize', () => {
    const { canvas, listeners } = setup({ dpr: 1 });
    triggerFireworks();
    expect(listeners.resize.opts).toEqual({ once: true });
    window.innerWidth = 800;
    listeners.resize.fn();
    expect(canvas.width).toBe(800);
  });
});
