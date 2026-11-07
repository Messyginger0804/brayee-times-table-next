import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getReq } from './helpers';

const cookieGet = vi.fn();
vi.mock('next/headers', () => ({ cookies: () => ({ get: cookieGet }) }));
vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() } } }));
vi.mock('../../app/api/_utils', () => ({ getUserId: vi.fn() }));
vi.mock('../../lib/guests', async () => {
  const actual = await vi.importActual('../../lib/guests');
  return { ...actual, purgeExpired: vi.fn() };
});

vi.mock('../../lib/savedCadetPurge', () => ({ purgeInactiveSaved: vi.fn().mockResolvedValue(0) }));

import { prisma } from '../../lib/prisma';
import { getUserId } from '../../app/api/_utils';
import { GUEST_COOKIE, hashToken, purgeExpired, validateGuestSession } from '../../lib/guests';
import { GET as cronGET } from '../../app/api/cron/purge-guests/route';
import { GET as meGET } from '../../app/api/auth/me/route';

const SECRET = 'test-cron-secret';
const cronReq = (auth) => new Request('http://localhost/api/cron/purge-guests', { headers: auth ? { authorization: auth } : {} });
let savedSecret;
beforeEach(() => { vi.clearAllMocks(); savedSecret = process.env.CRON_SECRET; cookieGet.mockReturnValue(undefined); });
afterEach(() => { if (savedSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = savedSecret; });

describe('GET /api/cron/purge-guests auth gate', () => {
  it('401 when CRON_SECRET is unset, even with a matching-looking header', async () => {
    delete process.env.CRON_SECRET;
    expect((await cronGET(cronReq('Bearer undefined'))).status).toBe(401);
    expect((await cronGET(cronReq('Bearer '))).status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
  });
  it('401 with a missing or wrong bearer', async () => {
    process.env.CRON_SECRET = SECRET;
    expect((await cronGET(cronReq())).status).toBe(401);
    expect((await cronGET(cronReq('Bearer nope'))).status).toBe(401);
    expect((await cronGET(cronReq(SECRET))).status).toBe(401);
    expect(purgeExpired).not.toHaveBeenCalled();
  });
  it('purges with the right bearer', async () => {
    process.env.CRON_SECRET = SECRET;
    purgeExpired.mockResolvedValue(2);
    const res = await cronGET(cronReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: 2, purgedSaved: 0 });
  });
});

describe('GET /api/auth/me', () => {
  const guest = { id: 4, isGuest: true, guestSeat: 3, guestTokenHash: hashToken('tok'), level: 1, grade: 2, name: 'Guest 003' };
  it('401 when logged out', async () => {
    getUserId.mockResolvedValue(null);
    expect((await meGET()).status).toBe(401);
  });
  it('404 when the user row is gone', async () => {
    getUserId.mockResolvedValue(9);
    prisma.user.findUnique.mockResolvedValue(null);
    expect((await meGET()).status).toBe(404);
  });
  it('real user: profile, no guest cookie', async () => {
    getUserId.mockResolvedValue(1);
    prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'Braylee', level: 2, grade: 3, image: null, isGuest: false });
    const res = await meGET();
    expect((await res.json())).toMatchObject({ id: 1, name: 'Braylee', isGuest: false, grade: 3 });
    expect(res.headers.get('set-cookie') || '').not.toContain(GUEST_COOKIE);
  });
  it('guest: anonymous profile and the resume cookie slides when it matches the seat', async () => {
    getUserId.mockResolvedValue(4);
    prisma.user.findUnique.mockResolvedValue(guest);
    cookieGet.mockReturnValue({ value: 'tok' });
    const res = await meGET();
    expect(await res.json()).toEqual({ id: 4, name: '003', level: 1, image: null, isGuest: true, seat: 3, grade: 2 });
    const c = res.headers.get('set-cookie');
    expect(c).toContain(`${GUEST_COOKIE}=tok`);
    expect(c).toMatch(/Max-Age=604800/i);
  });
  it('guest: no cookie, or a cookie for another seat, is not re-set', async () => {
    getUserId.mockResolvedValue(4);
    prisma.user.findUnique.mockResolvedValue(guest);
    expect((await meGET()).headers.get('set-cookie') || '').not.toContain(GUEST_COOKIE);
    cookieGet.mockReturnValue({ value: 'someone-else' });
    expect((await meGET()).headers.get('set-cookie') || '').not.toContain(GUEST_COOKIE);
  });
});

describe('lazy purge is best effort', () => {
  it('validateGuestSession still works when the stale-seat lookup throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.user.findMany.mockRejectedValue(new Error('db down'));
    prisma.user.findUnique.mockResolvedValue({ isGuest: true, guestTokenHash: 'h' });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    expect(await validateGuestSession(4, 'h', prisma)).toBe(true);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
