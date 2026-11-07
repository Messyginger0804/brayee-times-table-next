// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import BrayleeCheer from '../components/braylee/BrayleeCheer';
import AstronautStage from '../components/game/AstronautStage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const calls = [];

function mockAvatar({ braylee }) {
  calls.length = 0;
  globalThis.fetch = vi.fn(async (url) => {
    calls.push(String(url));
    // the host photo is public; the player's own photo exists only for Braylee (guests get 404)
    const ok = String(url).startsWith('/api/avatar/host') || braylee;
    return { ok, blob: async () => new Blob(['x'], { type: 'image/webp' }) };
  });
}

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  URL.createObjectURL = () => 'blob:face';
  URL.revokeObjectURL = () => {};
});

async function renderIn(node) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(node); });
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  return el;
}

describe.each([
  ['level-up modal astronaut', () => h(BrayleeCheer, { moment: 'levelUp', pose: 'levelUp' })],
  ['in-game astronaut', () => h(AstronautStage, { listen: false })],
])('%s', (_name, make) => {
  it('shows the emoji for a guest and never asks for the host photo', async () => {
    mockAvatar({ braylee: false });
    const el = await renderIn(make());
    expect(calls.some((u) => u.startsWith('/api/avatar/host'))).toBe(false);
    expect(el.querySelector('svg image')).toBeNull();
    expect(el.textContent).toContain('👩‍🚀');
  });

  it('shows her photo for Braylee from her own avatar route', async () => {
    mockAvatar({ braylee: true });
    const el = await renderIn(make());
    expect(calls.some((u) => u.startsWith('/api/avatar/host'))).toBe(false);
    expect(calls.some((u) => u.startsWith('/api/avatar?'))).toBe(true);
    expect(el.querySelector('svg image')).not.toBeNull();
  });
});
