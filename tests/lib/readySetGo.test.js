import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildSteps, totalMs, nextIndex, stepAt, isSkipKey, introKeyAction, startAfterIntro } from '../../lib/readySetGo';
import { gameFx } from '../../lib/gameFx';

afterEach(() => vi.useRealTimers());

describe('countdown steps', () => {
  it('runs ready, 3, 2, 1, GO in about 3-3.5 seconds', () => {
    const steps = buildSteps(false);
    expect(steps.map((s) => s.label)).toEqual([null, '3', '2', '1', 'GO!']);
    expect(totalMs(steps)).toBeGreaterThanOrEqual(3000);
    expect(totalMs(steps)).toBeLessThanOrEqual(3500);
    expect(steps[0].pose).toBe('welcome');
    expect(steps[4].pose).not.toBe('welcome'); // cheering on GO
  });
  it('maps elapsed time to a step and ends with -1', () => {
    const steps = buildSteps(false);
    expect(stepAt(steps, 0)).toBe(0);
    expect(stepAt(steps, 950)).toBe(1);
    expect(stepAt(steps, totalMs(steps) - 1)).toBe(4);
    expect(stepAt(steps, totalMs(steps))).toBe(-1);
  });
  it('advances then reports done', () => {
    const steps = buildSteps(false);
    expect(nextIndex(steps, 0)).toBe(1);
    expect(nextIndex(steps, steps.length - 1)).toBe(-1);
  });
  it('reduced motion is one static ~1s step', () => {
    const steps = buildSteps(true);
    expect(steps).toHaveLength(1);
    expect(steps[0].label).toBe("Let's go!");
    expect(totalMs(steps)).toBe(1000);
    expect(nextIndex(steps, 0)).toBe(-1);
  });
  it('Enter, Space and Escape skip; other keys do not', () => {
    for (const k of ['Enter', ' ', 'Escape']) expect(isSkipKey(k)).toBe(true);
    for (const k of ['a', '5', 'Tab']) expect(isSkipKey(k)).toBe(false);
  });
});

describe('startAfterIntro', () => {
  const makeIntro = () => {
    let finish;
    const playIntro = vi.fn(() => new Promise((r) => { finish = r; }));
    return { playIntro, finish: () => finish() };
  };

  it('starts only after the intro finishes', async () => {
    const { playIntro, finish } = makeIntro();
    const onReady = vi.fn();
    startAfterIntro(playIntro, onReady);
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
    finish();
    await Promise.resolve(); await Promise.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('does nothing once cancelled (unmount mid-intro)', async () => {
    const { playIntro, finish } = makeIntro();
    const onReady = vi.fn();
    const cancel = startAfterIntro(playIntro, onReady);
    cancel();
    finish();
    await Promise.resolve(); await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
  });

  it('strict-mode double run: only the live (second) effect starts the round', async () => {
    const { playIntro, finish } = makeIntro();
    const onReady = vi.fn();
    const cancelFirst = startAfterIntro(playIntro, onReady);
    cancelFirst();
    startAfterIntro(playIntro, onReady);
    finish();
    await Promise.resolve(); await Promise.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('works with a timer-driven intro under fake timers', async () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    startAfterIntro(() => new Promise((r) => setTimeout(r, totalMs(buildSteps(false)))), onReady);
    await vi.advanceTimersByTimeAsync(totalMs(buildSteps(false)) - 1);
    expect(onReady).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe('gameFx moments', () => {
  it('carries a moment on correct/wrong and stays silent on a silent reset', () => {
    const seen = [];
    const off = gameFx.on((e) => seen.push(e));
    gameFx.correct('spellingCorrect');
    gameFx.wrong('spellingWrong');
    gameFx.correct();
    gameFx.reset({ silent: true });
    gameFx.reset();
    off();
    expect(seen).toEqual([
      { type: 'correct', moment: 'spellingCorrect' },
      { type: 'wrong', moment: 'spellingWrong' },
      { type: 'correct' },
      { type: 'session' },
    ]);
  });
});

describe('introKeyAction', () => {
  it('skips on Enter, Space and Escape', () => {
    for (const key of ['Enter', ' ', 'Escape']) expect(introKeyAction({ key })).toBe('skip');
  });
  it('blocks digits, letters and Backspace', () => {
    for (const key of ['7', 'a', 'Backspace', 'Tab']) expect(introKeyAction({ key })).toBe('block');
  });
  it('lets browser shortcuts through', () => {
    expect(introKeyAction({ key: 'r', ctrlKey: true })).toBe('pass');
    expect(introKeyAction({ key: 'l', metaKey: true })).toBe('pass');
  });
});
