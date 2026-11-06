import { describe, it, expect, beforeEach } from 'vitest';
import { hit, clientIp, cfg, _size, _resetRateLimits } from '../lib/rateLimit';

beforeEach(() => _resetRateLimits());

describe('rateLimit', () => {
  it('allows up to the limit then blocks until the window ends', () => {
    for (let i = 0; i < 3; i++) expect(hit('k', 3, 1000, 0).ok).toBe(true);
    const r = hit('k', 3, 1000, 10);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBe(1);
    expect(hit('k', 3, 1000, 1001).ok).toBe(true); // new window
    expect(hit('other', 3, 1000, 10).ok).toBe(true); // separate key
  });
  it('reads the first forwarded IP', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
    expect(clientIp({ 'x-real-ip': '5.6.7.8' })).toBe('5.6.7.8');
    expect(clientIp(undefined)).toBe('unknown');
  });
});

describe('hard memory cap', () => {
  it('never exceeds maxKeys under a flood of unique keys, evicting oldest first', () => {
    const saved = cfg.maxKeys;
    cfg.maxKeys = 50;
    try {
      for (let i = 0; i < 5000; i++) {
        hit(`ip${i}`, 5, 60_000, 1000 + i);
        expect(_size()).toBeLessThanOrEqual(50);
      }
      expect(_size()).toBe(50);
      // oldest were evicted (fresh window again), newest kept their counts
      for (let i = 0; i < 5; i++) hit('ip4999', 5, 60_000, 6000); // 1 earlier + 5 = 6 > 5
      expect(hit('ip4999', 5, 60_000, 6000).ok).toBe(false);
      expect(hit('ip0', 1, 60_000, 6000).ok).toBe(true);
    } finally { cfg.maxKeys = saved; }
  });
  it('prunes expired entries so a long-lived instance does not accumulate keys', () => {
    const saved = cfg.maxKeys;
    cfg.maxKeys = 20;
    try {
      for (let i = 0; i < 20; i++) hit(`a${i}`, 5, 1000, 0);
      expect(_size()).toBe(20);
      hit('fresh', 5, 1000, 5000); // all of a* expired: swept, not evicted one by one
      expect(_size()).toBe(1);
      expect(hit('a1', 1, 1000, 5001).ok).toBe(true); // an expired key starts a new window on access
    } finally { cfg.maxKeys = saved; }
  });
});
