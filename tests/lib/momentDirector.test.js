import { describe, it, expect, vi } from 'vitest';
import { createDirector } from '../../lib/momentDirector';
import { currentUserImage } from '../../lib/userImage';

describe('moment director', () => {
  it('lets a higher rank preempt the holder', () => {
    const d = createDirector();
    const hidden = vi.fn();
    d.claim('bubble', hidden);
    expect(d.claim('celebrate')).toBeTypeOf('function');
    expect(hidden).toHaveBeenCalledOnce();
    expect(d.current()).toBe('celebrate');
  });

  it('drops a lower rank while a higher one is up (no backlog)', () => {
    const d = createDirector();
    const releaseModal = d.claim('modal');
    expect(d.claim('streak')).toBeNull();
    expect(d.claim('celebrate')).toBeNull();
    expect(d.claim('bubble')).toBeNull();
    releaseModal();
    expect(d.current()).toBeNull(); // nothing was queued behind the modal
  });

  it('orders modal > streak > celebrate > bubble', () => {
    const d = createDirector();
    d.claim('bubble');
    expect(d.claim('celebrate')).not.toBeNull();
    expect(d.claim('bubble')).toBeNull();
    expect(d.claim('streak')).not.toBeNull();
    expect(d.claim('celebrate')).toBeNull();
    expect(d.claim('modal')).not.toBeNull();
    expect(d.claim('streak')).toBeNull();
  });

  it('an equal rank replaces the holder and the old release is then a no-op', () => {
    const d = createDirector();
    const gone = vi.fn();
    const releaseOld = d.claim('streak', gone);
    d.claim('streak');
    expect(gone).toHaveBeenCalledOnce();
    releaseOld();
    expect(d.current()).toBe('streak');
  });

  it('rejects unknown kinds and notifies subscribers', () => {
    const d = createDirector();
    const l = vi.fn();
    d.subscribe(l);
    expect(d.claim('trophy')).toBeNull();
    d.claim('modal')();
    expect(l).toHaveBeenCalledTimes(2);
  });
});

describe('director regressions', () => {
  it('a denied claim leaves the live card releasable: streak up, tryAgain denied, card ends, celebrate shows', () => {
    const d = createDirector();
    const releaseStreak = d.claim('streak');
    expect(d.claim('celebrate')).toBeNull(); // tryAgain (celebrate rank) denied
    releaseStreak();
    expect(d.current()).toBeNull();
    expect(d.claim('celebrate')).toBeTypeOf('function');
  });

  it('releases are idempotent and token-based', () => {
    const d = createDirector();
    const a = d.claim('streak');
    const b = d.claim('streak'); // replaces a
    a(); a();
    expect(d.current()).toBe('streak');
    b();
    expect(d.current()).toBeNull();
  });

  it('overlapping modals free the stage only when the last one releases', () => {
    const d = createDirector();
    const m1 = d.claim('modal');
    const m2 = d.claim('modal');
    m1();
    expect(d.current()).toBe('modal');
    m2();
    expect(d.current()).toBeNull();
  });

  it('auto-releases a hold that outlives the safety net', () => {
    vi.useFakeTimers();
    const warn = vi.fn();
    const d = createDirector({ maxHoldMs: 1000, warn });
    d.claim('modal');
    vi.advanceTimersByTime(1001);
    expect(d.current()).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe('currentUserImage', () => {
  it('drops the deleted seed image and non-strings, keeps live paths', () => {
    expect(currentUserImage('/Braylee.jpg')).toBeNull();
    expect(currentUserImage(null)).toBeNull();
    expect(currentUserImage('/braylee/face-512.webp')).toBe('/braylee/face-512.webp');
  });
});
