// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('../lib/cheerVoice', () => ({ replayCheer: vi.fn() }));
import { replayCheer } from '../lib/cheerVoice';
import { SpeechBubble } from '../components/game/HostAstronaut';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));

describe('replayable SpeechBubble', () => {
  it('tap replays the line and does not reach parent handlers; text is announced once', async () => {
    const parentClick = vi.fn();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(h('div', { onClick: parentClick }, h(SpeechBubble, { text: 'Great job! 🚀', replay: true }))); });
    const btn = el.querySelector('button[aria-label="Hear Braylee say it again"]');
    expect(btn).toBeTruthy();
    expect(el.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(el.querySelector('[role="status"]').textContent).toBe('Great job! 🚀');
    await act(async () => { btn.click(); });
    expect(replayCheer).toHaveBeenCalledWith('Great job! 🚀');
    expect(parentClick).not.toHaveBeenCalled();
  });
  it('a bubble without replay stays a plain live region', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(h(SpeechBubble, { text: 'Hi' })); });
    expect(el.querySelector('button')).toBeNull();
  });
});
