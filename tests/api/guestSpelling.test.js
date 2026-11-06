import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jsonReq, getReq } from './helpers';

const cookieGet = vi.fn();
vi.mock('next/headers', () => ({ cookies: () => ({ get: cookieGet }) }));
vi.mock('../../lib/guests', async () => {
  const actual = await vi.importActual('../../lib/guests');
  return { ...actual, claimSeat: vi.fn(), findSeatByToken: vi.fn(), releaseByToken: vi.fn() };
});
vi.mock('../../lib/prisma', () => ({ prisma: { user: { findUnique: vi.fn() }, spellingWord: { findMany: vi.fn() } } }));
vi.mock('../../app/api/_utils', () => ({ getUserId: vi.fn() }));

import { prisma } from '../../lib/prisma';
import { getUserId } from '../../app/api/_utils';
import { GUEST_COOKIE, claimSeat, findSeatByToken, releaseByToken } from '../../lib/guests';
import { POST as claimPOST } from '../../app/api/guest/claim/route';
import { GET as statusGET } from '../../app/api/guest/status/route';
import { GET as wordsGET } from '../../app/api/spelling/words/route';
import fallbackWords from '../../lib/spellingWords.json';

beforeEach(() => { vi.clearAllMocks(); cookieGet.mockReturnValue(undefined); });
const setCookie = (res) => res.headers.get('set-cookie') || '';

describe('POST /api/guest/claim', () => {
  it('resume without a seat -> 409, no cookie to clear when none was sent', async () => {
    findSeatByToken.mockResolvedValue(null);
    const res = await claimPOST(jsonReq({ mode: 'resume' }));
    expect(res.status).toBe(409);
    expect(setCookie(res)).not.toContain(GUEST_COOKIE);
  });
  it('resume with a stale cookie -> 409 and the cookie is cleared', async () => {
    cookieGet.mockReturnValue({ value: 'stale' });
    findSeatByToken.mockResolvedValue(null);
    const res = await claimPOST(jsonReq({ mode: 'resume' }));
    expect(res.status).toBe(409);
    expect(setCookie(res)).toMatch(new RegExp(`${GUEST_COOKIE}=;`));
  });
  it('resume with a live seat keeps the same token and returns the seat label', async () => {
    cookieGet.mockReturnValue({ value: 'tok' });
    findSeatByToken.mockResolvedValue({ guestSeat: 3 });
    const res = await claimPOST(jsonReq({ mode: 'resume' }));
    expect(await res.json()).toEqual({ seat: 3, label: '003' });
    expect(setCookie(res)).toContain(`${GUEST_COOKIE}=tok`);
    expect(claimSeat).not.toHaveBeenCalled();
  });
  it('new (default, also for junk bodies) claims a seat and sets its token', async () => {
    claimSeat.mockResolvedValue({ user: { guestSeat: 12 }, token: 'fresh' });
    const res = await claimPOST(jsonReq('not json'));
    expect(await res.json()).toEqual({ seat: 12, label: '012' });
    expect(setCookie(res)).toContain(`${GUEST_COOKIE}=fresh`);
    expect(releaseByToken).not.toHaveBeenCalled();
  });
  it('new releases this device\'s previous seat first', async () => {
    cookieGet.mockReturnValue({ value: 'old' });
    claimSeat.mockResolvedValue({ user: { guestSeat: 1 }, token: 'n' });
    await claimPOST(jsonReq({ mode: 'new' }));
    expect(releaseByToken).toHaveBeenCalledWith('old');
  });
});

describe('GET /api/guest/status', () => {
  it('no cookie -> resume null, no cookie header', async () => {
    findSeatByToken.mockResolvedValue(null);
    const res = await statusGET();
    expect(await res.json()).toEqual({ resume: null });
    expect(setCookie(res)).toBe('');
  });
  it('cookie with a live seat -> resume info', async () => {
    cookieGet.mockReturnValue({ value: 't' });
    findSeatByToken.mockResolvedValue({ guestSeat: 5 });
    expect(await (await statusGET()).json()).toEqual({ resume: { seat: 5, label: '005' } });
  });
  it('cookie whose seat was wiped -> cleared', async () => {
    cookieGet.mockReturnValue({ value: 't' });
    findSeatByToken.mockResolvedValue(null);
    const res = await statusGET();
    expect(await res.json()).toEqual({ resume: null });
    expect(setCookie(res)).toMatch(new RegExp(`${GUEST_COOKIE}=;`));
  });
});

describe('GET /api/spelling/words', () => {
  const url = (q = '') => getReq(`http://localhost/api/spelling/words${q}`);
  const rows = [{ id: 1, word: 'cat' }];
  beforeEach(() => { getUserId.mockResolvedValue(null); });

  it.each([['?grade=9'], ['?tier=bogus'], ['?unit=bad%20unit']])('400 for %s', async (q) => {
    expect((await wordsGET(url(q))).status).toBe(400);
    expect(prisma.spellingWord.findMany).not.toHaveBeenCalled();
  });
  it('explicit filters are passed to the query', async () => {
    prisma.spellingWord.findMany.mockResolvedValue(rows);
    const body = await (await wordsGET(url('?grade=3&unit=g3u6&tier=core'))).json();
    expect(body).toEqual({ source: 'db', grade: 3, words: rows });
    expect(prisma.spellingWord.findMany.mock.calls[0][0].where).toEqual({ active: true, grade: 3, unitId: 'g3u6', tier: 'core' });
  });
  it('explicit grade with no rows is still a db answer (empty list, no fallback)', async () => {
    prisma.spellingWord.findMany.mockResolvedValue([]);
    expect(await (await wordsGET(url('?grade=2'))).json()).toEqual({ source: 'db', grade: 2, words: [] });
  });
  it('signed-in kid\'s grade is used when none is given', async () => {
    getUserId.mockResolvedValue(7);
    prisma.user.findUnique.mockResolvedValue({ grade: 4 });
    prisma.spellingWord.findMany.mockResolvedValue(rows);
    const body = await (await wordsGET(url())).json();
    expect(body.grade).toBe(4);
    expect(prisma.spellingWord.findMany.mock.calls[0][0].where).toEqual({ active: true, grade: 4 });
  });
  it('signed-in kid without a grade gets every active word', async () => {
    getUserId.mockResolvedValue(7);
    prisma.user.findUnique.mockResolvedValue({ grade: null });
    prisma.spellingWord.findMany.mockResolvedValue(rows);
    expect((await (await wordsGET(url())).json()).grade).toBeNull();
    expect(prisma.spellingWord.findMany.mock.calls[0][0].where).toEqual({ active: true });
  });
  it('signed-in user row missing -> treated as no grade', async () => {
    getUserId.mockResolvedValue(7);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.spellingWord.findMany.mockResolvedValue(rows);
    expect((await (await wordsGET(url())).json()).grade).toBeNull();
  });
  it('kid\'s grade has no rows -> falls back to all active words', async () => {
    getUserId.mockResolvedValue(7);
    prisma.user.findUnique.mockResolvedValue({ grade: 6 });
    prisma.spellingWord.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
    expect(await (await wordsGET(url())).json()).toEqual({ source: 'db', grade: null, words: rows });
    expect(prisma.spellingWord.findMany.mock.calls[1][0].where).toEqual({ active: true });
  });
  it('empty table -> bundled fallback list', async () => {
    prisma.spellingWord.findMany.mockResolvedValue([]);
    const body = await (await wordsGET(url())).json();
    expect(body.source).toBe('fallback');
    expect(body.words).toEqual(fallbackWords);
  });
  it('database failure -> bundled fallback list (200)', async () => {
    prisma.spellingWord.findMany.mockRejectedValue(new Error('down'));
    const res = await wordsGET(url('?grade=3'));
    expect(res.status).toBe(200);
    expect((await res.json()).source).toBe('fallback');
  });
});
