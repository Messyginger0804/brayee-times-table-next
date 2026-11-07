// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import VoiceSettings from '../components/VoiceSettings';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  window.speechSynthesis = { getVoices: () => [{ name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha' }], addEventListener() {}, cancel() {}, speak() {}, speaking: false };
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('VoiceSettings dialog focus', () => {
  it('moves focus in once, ignores parent re-renders, and returns it to the Voice button on close', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    const render = () => act(async () => { root.render(h(VoiceSettings)); });
    await render();
    const trigger = el.querySelector('button[aria-label="Voice settings"]');
    trigger.focus();
    await act(async () => { trigger.click(); });
    const select = document.querySelector('select');
    expect(document.activeElement).toBe(select);
    // user moves on to the next control, then the parent re-renders
    const sw = document.querySelector('[role="switch"]');
    sw.focus();
    await render();
    await render();
    expect(document.activeElement).toBe(sw);
    const done = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Done');
    await act(async () => { done.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(document.activeElement).toBe(trigger);
    root.unmount();
  });
});
