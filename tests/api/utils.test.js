import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('../../lib/auth', () => ({ authOptions: { marker: 'opts' } }));
vi.mock('../../lib/guests', () => ({ validateGuestSession: vi.fn() }));
import { getServerSession } from 'next-auth/next';
import { validateGuestSession } from '../../lib/guests';
import { getUserId, requireUserId, requireProblemRequest } from '../../app/api/_utils';

beforeEach(() => vi.clearAllMocks());

describe('getUserId', () => {
  it('returns null with no session / no user id', async () => {
    getServerSession.mockResolvedValue(null);
    expect(await getUserId()).toBeNull();
    getServerSession.mockResolvedValue({ user: {} });
    expect(await getUserId()).toBeNull();
    expect(getServerSession).toHaveBeenCalledWith({ marker: 'opts' });
  });

  it.each([['abc'], ['0'], ['-3'], ['NaN']])('rejects non-positive / non-numeric id %j', async (id) => {
    getServerSession.mockResolvedValue({ user: { id } });
    expect(await getUserId()).toBeNull();
  });

  it('returns the numeric id for a normal user without consulting guest checks', async () => {
    getServerSession.mockResolvedValue({ user: { id: '42' } });
    expect(await getUserId()).toBe(42);
    expect(validateGuestSession).not.toHaveBeenCalled();
  });

  it('guest session: valid seat key passes', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', gk: 'hash' } });
    validateGuestSession.mockResolvedValue(true);
    expect(await getUserId()).toBe(9);
    expect(validateGuestSession).toHaveBeenCalledWith(9, 'hash');
  });

  it('guest session: rotated/wiped seat loses access', async () => {
    getServerSession.mockResolvedValue({ user: { id: '9', gk: 'stale' } });
    validateGuestSession.mockResolvedValue(false);
    expect(await getUserId()).toBeNull();
  });
});

describe('requireUserId', () => {
  it('401 response when logged out', async () => {
    getServerSession.mockResolvedValue(null);
    const r = await requireUserId();
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: 'Not logged in' });
  });
  it('the numeric id when logged in', async () => {
    getServerSession.mockResolvedValue({ user: { id: '5' } });
    expect(await requireUserId()).toBe(5);
  });
});

describe('requireProblemRequest', () => {
  it('401 when logged out', async () => {
    getServerSession.mockResolvedValue(null);
    const { error } = await requireProblemRequest({ id: '3' });
    expect(error.status).toBe(401);
  });
  it('400 for a non-integer problem id', async () => {
    getServerSession.mockResolvedValue({ user: { id: '5' } });
    const { error } = await requireProblemRequest({ id: 'x' });
    expect(error.status).toBe(400);
    expect(await error.json()).toEqual({ error: 'Invalid problem id' });
  });
  it('returns both ids on success', async () => {
    getServerSession.mockResolvedValue({ user: { id: '5' } });
    expect(await requireProblemRequest({ id: '12' })).toEqual({ userId: 5, actor: { id: 5, gk: null }, problemId: 12 });
  });
});
