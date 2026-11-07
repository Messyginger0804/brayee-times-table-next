import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../app/api/_utils', () => ({ getUserId: vi.fn() }));
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../app/api/_utils';
import { GET } from '../../app/api/auth/me/route';

const HASH = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ0123';
const base = { id: 4, name: 'Braylee', level: 2, grade: 3, image: '/braylee/face-512.webp', pin: HASH, guestTokenHash: 'tok', failedLoginAttempts: 0, lockedUntil: null, isGuest: false, savedCadet: false };
const me = async (row) => { getUserId.mockResolvedValue(row.id); prisma.user.findUnique.mockResolvedValue(row); const r = await GET(); return { status: r.status, body: await r.json() }; };
beforeEach(() => vi.clearAllMocks());

describe('GET /api/auth/me', () => {
  it('Braylee: real account, own image, not saved', async () => {
    expect((await me(base)).body).toEqual({ id: 4, name: 'Braylee', level: 2, image: '/braylee/face-512.webp', isGuest: false, isSaved: false, grade: 3 });
  });
  it('legacy dead image path becomes null (userImage sanitizing survives)', async () => {
    expect((await me({ ...base, image: '/Braylee.jpg' })).body.image).toBeNull();
  });
  it('guest: seat label, no photo, isGuest', async () => {
    const { body } = await me({ ...base, id: 9, name: 'Guest 003', isGuest: true, guestSeat: 3, image: null });
    expect(body).toEqual({ id: 9, name: '003', level: 2, image: null, isGuest: true, seat: 3, grade: 3 });
  });
  it('saved cadet: nickname, no photo, isSaved, not a guest', async () => {
    const { body } = await me({ ...base, id: 12, name: 'Luna', image: null, savedCadet: true });
    expect(body).toEqual({ id: 12, name: 'Luna', level: 2, image: null, isGuest: false, isSaved: true, grade: 3 });
  });
  it('never returns the pin/ID hash or any secret, for any account type', async () => {
    for (const row of [base, { ...base, id: 9, isGuest: true, guestSeat: 1 }, { ...base, id: 12, name: 'Luna', savedCadet: true }]) {
      const text = JSON.stringify((await me(row)).body);
      expect(text).not.toContain(HASH);
      expect(text).not.toMatch(/pin|guestTokenHash|tok"|failedLogin|lockedUntil/);
    }
  });
});
