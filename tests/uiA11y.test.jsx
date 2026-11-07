// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import Modal from '../components/ui/Modal';
import QuestionCard from '../components/game/QuestionCard';
import Keypad from '../components/game/Keypad';
import { triggerFireworks } from '../lib/fireworks';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const key = (k, o = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...o }));

describe('Modal', () => {
  it('traps Tab, inerts the page, keeps focus on re-render, restores focus on close', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const opener = document.createElement('button');
    el.appendChild(opener);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const onClose = vi.fn();
    const render = (open) => act(async () => {
      root.render(h(Modal, { open, onClose: () => onClose(), title: 'T', actions: [h('button', { key: 'a' }, 'A'), h('button', { key: 'b' }, 'B')] }, 'x'));
    });
    opener.focus();
    await render(true);
    const [a, b] = document.querySelectorAll('[role="dialog"] button');
    expect(document.activeElement).toBe(a);
    expect(el.inert).toBe(true);
    b.focus();
    await render(true);
    expect(document.activeElement).toBe(b);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(a);
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(back);
    expect(document.activeElement).toBe(b);
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    await render(false);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(el.inert).toBeFalsy();
    expect(document.activeElement).toBe(opener);
    root.unmount();
  });
});

describe('QuestionCard', () => {
  it('has a polite live region announcing the question', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(h(QuestionCard, { id: 1, problem: '7 x 8', answer: 56, typed: '' })); });
    const live = el.querySelector('[data-testid="question-announce"]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('Question: 7 × 8');
    root.unmount();
  });
});

describe('Keypad', () => {
  it('uses touch-manipulation on keys', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(h(Keypad, { onDigit() {}, onBackspace() {}, onSubmit() {} })); });
    const btns = el.querySelectorAll('button');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((b) => expect(b.className).toContain('touch-manipulation'));
    root.unmount();
  });
});

describe('triggerFireworks', () => {
  it('does nothing under prefers-reduced-motion', () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true });
    try {
      const before = document.querySelectorAll('canvas').length;
      triggerFireworks();
      expect(document.querySelectorAll('canvas').length).toBe(before);
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('Button', () => {
  it('renders an anchor for href and a real button otherwise', async () => {
    const { default: Button } = await import('../components/ui/Button');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(h('div', null, h(Button, { href: '/play' }, 'Internal'), h(Button, { href: 'https://example.com' }, 'External'), h(Button, null, 'Plain'))); });
    const links = el.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/play');
    expect(links[1].getAttribute('href')).toBe('https://example.com');
    expect(el.querySelectorAll('button').length).toBe(1);
    root.unmount();
  });
});

describe('GifImage', () => {
  it('hides itself when the image fails to load', async () => {
    const { default: GifImage } = await import('../components/gif/GifImage');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => { root.render(h(GifImage, { gif: { url: '/a.gif', webp: '/a.webp', title: 'A gif' } })); });
    const img = el.querySelector('img');
    expect(img.getAttribute('alt')).toBe('A gif');
    await act(async () => { img.dispatchEvent(new Event('error')); });
    expect(el.querySelector('img')).toBeNull();
    root.unmount();
  });
});
