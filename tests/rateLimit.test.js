import { describe, it, expect, beforeEach } from 'vitest';
import { hit, clientIp, _resetRateLimits } from '../lib/rateLimit';

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
