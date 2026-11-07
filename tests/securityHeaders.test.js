import { describe, it, expect } from 'vitest';
import nextConfig from '../next.config.js';

describe('next.config.js headers()', () => {
  it('sends the clickjacking / sniffing / referrer headers on every route', async () => {
    const rules = await nextConfig.headers();
    const rule = rules.find((r) => r.source === '/(.*)');
    const h = Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]));
    expect(h).toEqual({
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
  });
});
