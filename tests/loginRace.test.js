import { describe, it, expect, vi } from 'vitest';
import { confirmSession } from '../lib/confirmSession';

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));
const jwt = await import('next-auth/jwt');
const { middleware, config } = await import('../middleware');

const noWait = () => Promise.resolve();

describe('confirmSession (login -> home race)', () => {
  it('retries until /api/auth/me answers 200', async () => {
    const fetchMe = vi.fn().mockResolvedValueOnce(401).mockRejectedValueOnce(new Error('net')).mockResolvedValue(200);
    expect(await confirmSession(fetchMe, { wait: noWait })).toBe(true);
    expect(fetchMe).toHaveBeenCalledTimes(3);
  });
  it('gives up (so the login page stays put) when the session never confirms', async () => {
    const fetchMe = vi.fn().mockResolvedValue(401);
    expect(await confirmSession(fetchMe, { tries: 3, wait: noWait })).toBe(false);
    expect(fetchMe).toHaveBeenCalledTimes(3);
  });
});

describe('middleware (no login <-> home loop)', () => {
  const req = (path) => ({ url: `http://localhost:3400${path}`, headers: new Headers(), cookies: { get: () => undefined } });
  it('sends logged-out visitors to /login', async () => {
    jwt.getToken.mockResolvedValue(null);
    const res = await middleware(req('/'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')).pathname).toBe('/login');
  });
  it('lets guest and Braylee sessions through', async () => {
    jwt.getToken.mockResolvedValue({ id: '7' });
    const res = await middleware(req('/spelling-bee'));
    expect(res.headers.get('location')).toBeNull();
  });
  it('never matches /login, so a redirect to it cannot bounce back', () => {
    const patterns = config.matcher.map((m) => new RegExp(`^${m.replace(/:path\*/, '.*')}$`));
    expect(patterns.some((r) => r.test('/login'))).toBe(false);
    expect(patterns.some((r) => r.test('/'))).toBe(true);
  });
});
