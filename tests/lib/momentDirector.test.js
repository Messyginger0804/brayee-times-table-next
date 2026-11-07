import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

describe('one Braylee face per screen', () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  it('only the HostAstronaut (login / guest home) renders the host photo', () => {
    const hostUsers = ['app', 'components'].flatMap(walk)
      .filter((f) => /\.jsx$/.test(f))
      .filter((f) => /<Astronaut\b[^>]*\bhost\b/.test(readFileSync(f, 'utf8')))
      .map((f) => f.split('/').pop());
    expect(hostUsers).toEqual(['HostAstronaut.jsx']);
  });
});

describe('currentUserImage', () => {
  it('drops the deleted seed image and non-strings, keeps live paths', () => {
    expect(currentUserImage('/Braylee.jpg')).toBeNull();
    expect(currentUserImage(null)).toBeNull();
    expect(currentUserImage('/braylee/face-512.webp')).toBe('/braylee/face-512.webp');
  });
});
