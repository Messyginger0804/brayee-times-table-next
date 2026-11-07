// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../lib/cheerVoice', () => ({ speakCheer: vi.fn(), replayCheer: vi.fn() }));
import { speakCheer, replayCheer } from '../lib/cheerVoice';
import AstronautStage from '../components/game/AstronautStage';
import { gameFx } from '../lib/gameFx';
import { director } from '../lib/momentDirector';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn(async () => ({ ok: false }));
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

async function mount() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(h(AstronautStage)); });
  return { el, root };
}
const bubble = (el) => el.querySelector('button[aria-label$="Hear Braylee say it again"]');

describe('astronaut bubble and the moment director', () => {
  it('a denied bubble plays no clip and is not tappable', async () => {
    const releaseCard = director.claim('streak');
    const { el, root } = await mount();
    await act(async () => { gameFx.emit('correct'); });
    expect(speakCheer).not.toHaveBeenCalled();
    expect(bubble(el)).toBeNull();
    releaseCard();
    await act(async () => root.unmount());
  });

  it('a shown bubble speaks once and tap replays that line', async () => {
    const { el, root } = await mount();
    await act(async () => { gameFx.emit('correct'); });
    const text = speakCheer.mock.calls[0]?.[0];
    expect(text).toBeTruthy();
    const b = bubble(el);
    expect(b).not.toBeNull();
    await act(async () => { b.click(); });
    expect(replayCheer).toHaveBeenCalledWith(text);
    await act(async () => root.unmount());
  });
});
