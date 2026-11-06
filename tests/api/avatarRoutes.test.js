import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReq } from './helpers';

vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../app/api/_utils', () => ({ getUserId: vi.fn() }));
vi.mock('../../lib/avatarFile', async () => {
  const actual = await vi.importActual('../../lib/avatarFile');
  return { ...actual, readAvatarMap: vi.fn(), avatarResponse: vi.fn() };
});
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../app/api/_utils';
import { readAvatarMap, avatarResponse } from '../../lib/avatarFile';
import { GET as avatarGET } from '../../app/api/avatar/route';
import { GET as hostGET } from '../../app/api/avatar/host/route';

beforeEach(() => { vi.clearAllMocks(); getUserId.mockResolvedValue(7); });
const OK = () => new Response('img', { status: 200 });

describe('GET /api/avatar', () => {
  const req = (q = '') => getReq(`http://localhost/api/avatar${q}`);
  it('401 when logged out', async () => {
    getUserId.mockResolvedValue(null);
    expect((await avatarGET(req())).status).toBe(401);
  });
  it('404 (private, no-store) when the user row is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await avatarGET(req());
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
  it('404 when the user has no mapping (including inherited keys like "toString")', async () => {
    prisma.user.findUnique.mockResolvedValue({ name: 'toString' });
    readAvatarMap.mockResolvedValue({ Other: 'o.png' });
    expect((await avatarGET(req())).status).toBe(404);
    expect(avatarResponse).not.toHaveBeenCalled();
  });
  it('404 when the map cannot be read', async () => {
    prisma.user.findUnique.mockResolvedValue({ name: 'Kid' });
    readAvatarMap.mockRejectedValue(new Error('ENOENT'));
    expect((await avatarGET(req())).status).toBe(404);
  });
  it('404 when the entry is not servable', async () => {
    prisma.user.findUnique.mockResolvedValue({ name: 'Kid' });
    readAvatarMap.mockResolvedValue({ Kid: 'x.txt' });
    avatarResponse.mockResolvedValue(null);
    expect((await avatarGET(req())).status).toBe(404);
  });
  it('serves only the caller\'s own mapped photo, honoring ?size', async () => {
    prisma.user.findUnique.mockResolvedValue({ name: 'Kid' });
    readAvatarMap.mockResolvedValue({ Kid: { 160: 's.png' }, Other: 'o.png' });
    const ok = OK();
    avatarResponse.mockResolvedValue(ok);
    expect(await avatarGET(req('?size=160&name=Other'))).toBe(ok);
    expect(avatarResponse).toHaveBeenCalledWith({ 160: 's.png' }, '160', 'private');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 7 }, select: { name: true } });
  });
});

describe('GET /api/avatar/host', () => {
  const req = (q = '') => getReq(`http://localhost/api/avatar/host${q}`);
  it('falls back to the committed photo (public, cached) with no "host" key', async () => {
    readAvatarMap.mockResolvedValue({ Kid: 'k.png' });
    const res = await hostGET(req());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/braylee/face-512.webp');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
  });
  it('falls back to the 160px photo for ?size=160 when the map is unreadable', async () => {
    readAvatarMap.mockRejectedValue(new Error('x'));
    const res = await hostGET(req('?size=160'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/braylee/face-160.webp');
  });
  it('an odd size never reaches the redirect path', async () => {
    readAvatarMap.mockRejectedValue(new Error('x'));
    const res = await hostGET(req('?size=../../etc'));
    expect(res.headers.get('location')).toBe('http://localhost/braylee/face-512.webp');
  });
  it('the private file wins over the fallback when present', async () => {
    readAvatarMap.mockResolvedValue({ host: 'h.png' });
    avatarResponse.mockResolvedValue(OK());
    expect((await hostGET(req())).status).toBe(200);
  });
  it('requires no session', async () => {
    getUserId.mockResolvedValue(null);
    readAvatarMap.mockResolvedValue({ host: 'h.png' });
    avatarResponse.mockResolvedValue(OK());
    expect((await hostGET(req())).status).toBe(200);
    expect(getUserId).not.toHaveBeenCalled();
  });
  it('a direct path entry is served as-is', async () => {
    readAvatarMap.mockResolvedValue({ host: 'h.png' });
    avatarResponse.mockResolvedValue(OK());
    await hostGET(req('?size=160'));
    expect(avatarResponse).toHaveBeenCalledWith('h.png', '160', 'public');
  });
  it('"host": "<Name>" resolves through the map', async () => {
    readAvatarMap.mockResolvedValue({ host: 'Brayee', Brayee: { 512: 'b.png' } });
    avatarResponse.mockResolvedValue(OK());
    await hostGET(req());
    expect(avatarResponse).toHaveBeenCalledWith({ 512: 'b.png' }, '512', 'public');
  });
  it('"host": "host" and unknown alias are not followed', async () => {
    readAvatarMap.mockResolvedValue({ host: 'host' });
    avatarResponse.mockResolvedValue(OK());
    await hostGET(req());
    expect(avatarResponse).toHaveBeenLastCalledWith('host', '512', 'public');
    readAvatarMap.mockResolvedValue({ host: 'nobody.png' });
    await hostGET(req());
    expect(avatarResponse).toHaveBeenLastCalledWith('nobody.png', '512', 'public');
  });
  it('falls back when the entry is not servable', async () => {
    readAvatarMap.mockResolvedValue({ host: 'h.txt' });
    avatarResponse.mockResolvedValue(null);
    expect((await hostGET(req())).status).toBe(307);
  });
});
