import { describe, it, expect, vi } from 'vitest';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('../lib/auth', () => ({ authOptions: {} }));
import { getServerSession } from 'next-auth';
import { POST as logoutPOST } from '../app/api/auth/logout/route';
import { POST as linkPOST } from '../app/api/auth/link-cookie/route';

const expired = (res) => res.headers.get('set-cookie') || '';

describe('the removed trusted-device cookie', () => {
  it('logout expires a stale device_trust cookie', async () => {
    expect(expired(await logoutPOST())).toMatch(/device_trust=;.*Max-Age=0/i);
  });
  it('link-cookie expires it too, and mints nothing', async () => {
    getServerSession.mockResolvedValue({ user: { id: '5' } });
    const res = await linkPOST();
    const c = expired(res);
    expect(c).toMatch(/device_trust=;.*Max-Age=0/i);
    expect(c.match(/device_trust=/g)).toHaveLength(1);
    getServerSession.mockResolvedValue(null);
    expect((await linkPOST()).status).toBe(401);
  });
});
