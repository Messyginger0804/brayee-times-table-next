import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: vi.fn(() => ({ adapter: true })) }));
vi.mock('../../lib/prisma', () => ({ prisma: { tag: 'prisma' } }));
vi.mock('../../lib/pinAuth', () => ({ verifyPin: vi.fn() }));
vi.mock('../../lib/guests', async () => {
  const actual = await vi.importActual('../../lib/guests');
  return { ...actual, findSeatByToken: vi.fn(), touchGuest: vi.fn() };
});
import { verifyPin } from '../../lib/pinAuth';
import { GUEST_COOKIE, findSeatByToken, touchGuest, hashToken } from '../../lib/guests';
import { authOptions } from '../../lib/auth';

const [pinProvider, guestProvider] = authOptions.providers;
// next-auth wraps the options we passed; the user-supplied authorize lives on .options
const pinAuthorize = pinProvider.options.authorize;
const guestAuthorize = guestProvider.options.authorize;

beforeEach(() => vi.clearAllMocks());

describe('PIN provider authorize', () => {
  it('returns a minimal user (string id, no pin) on success', async () => {
    verifyPin.mockResolvedValue({ ok: true, user: { id: 5, name: 'K', image: 'i', pin: 'HASH', level: 2 } });
    expect(await pinAuthorize({ name: 'K', pin: '1234' })).toEqual({ id: '5', name: 'K', image: 'i' });
    expect(verifyPin).toHaveBeenCalledWith('K', '1234', { ip: 'unknown' });
  });
  it('null for ordinary failures', async () => {
    verifyPin.mockResolvedValue({ ok: false, status: 401, error: 'Invalid name or PIN' });
    expect(await pinAuthorize({ name: 'K', pin: '0000' })).toBeNull();
  });
  it('surfaces the friendly cooldown message by throwing on 429', async () => {
    verifyPin.mockResolvedValue({ ok: false, status: 429, error: 'take a break' });
    await expect(pinAuthorize({ name: 'K', pin: '1234' })).rejects.toThrow('take a break');
  });
  it('passes undefined through when credentials are missing', async () => {
    verifyPin.mockResolvedValue({ ok: false, status: 400, error: 'x' });
    expect(await pinAuthorize(undefined)).toBeNull();
    expect(verifyPin).toHaveBeenCalledWith(undefined, undefined, { ip: 'unknown' });
  });
});

describe('guest provider authorize', () => {
  const cookie = `a=b; ${GUEST_COOKIE}=secret-token; c=d`;
  it('has the "guest" id', () => expect(guestProvider.options.id).toBe('guest'));
  it('null when the device has no live seat', async () => {
    findSeatByToken.mockResolvedValue(null);
    expect(await guestAuthorize({}, { headers: { cookie } })).toBeNull();
    expect(touchGuest).not.toHaveBeenCalled();
  });
  it('null with no request / no cookie header', async () => {
    findSeatByToken.mockResolvedValue(null);
    expect(await guestAuthorize({}, undefined)).toBeNull();
    expect(findSeatByToken).toHaveBeenCalledWith(null);
  });
  it('reads the seat token from a plain headers object, touches the seat and returns the hashed key', async () => {
    findSeatByToken.mockResolvedValue({ id: 31, name: 'Guest 031' });
    const user = await guestAuthorize({}, { headers: { cookie } });
    expect(findSeatByToken).toHaveBeenCalledWith('secret-token');
    expect(touchGuest).toHaveBeenCalledWith({ tag: 'prisma' }, 31, expect.any(Date), true);
    expect(user).toEqual({ id: '31', name: 'Guest 031', image: null, gk: hashToken('secret-token') });
    expect(user.gk).not.toContain('secret-token');
  });
  it('also supports Headers-like objects with get()', async () => {
    findSeatByToken.mockResolvedValue({ id: 2, name: 'G' });
    await guestAuthorize({}, { headers: new Headers({ cookie }) });
    expect(findSeatByToken).toHaveBeenCalledWith('secret-token');
  });
});

describe('callbacks', () => {
  const { jwt, session } = authOptions.callbacks;
  it('jwt copies id and guest key on sign-in; plain users get gk null', async () => {
    expect(await jwt({ token: {}, user: { id: '3' } })).toEqual({ id: '3', gk: null });
    expect(await jwt({ token: {}, user: { id: '3', gk: 'h' } })).toEqual({ id: '3', gk: 'h' });
  });
  it('jwt leaves the token alone on later requests (no user)', async () => {
    const t = { id: '3', gk: 'h' };
    expect(await jwt({ token: t })).toBe(t);
    expect(await jwt({ token: { x: 1 }, user: {} })).toEqual({ x: 1 });
  });
  it('session exposes id and gk only when present on the token', async () => {
    expect(await session({ session: { user: {} }, token: { id: '3', gk: 'h' } })).toEqual({ user: { id: '3', gk: 'h' } });
    expect(await session({ session: { user: {} }, token: { id: '3' } })).toEqual({ user: { id: '3' } });
    expect(await session({ session: { user: {} }, token: {} })).toEqual({ user: {} });
    expect(await session({ session: { user: {} }, token: undefined })).toEqual({ user: {} });
  });
  it('uses JWT sessions with the prisma adapter', () => {
    expect(authOptions.session.strategy).toBe('jwt');
    expect(authOptions.adapter).toEqual({ adapter: true });
  });
});
