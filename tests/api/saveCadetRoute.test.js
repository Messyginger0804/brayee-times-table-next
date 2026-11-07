import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import { jsonReq } from './helpers';

vi.mock('../../lib/prisma', () => ({ prisma: { tag: 'prisma' } }));
vi.mock('../../app/api/_utils', () => ({ requireActor: vi.fn() }));
vi.mock('../../lib/savedCadets', async () => {
  const actual = await vi.importActual('../../lib/savedCadets');
  return { ...actual, saveCadet: vi.fn() };
});
import { requireActor } from '../../app/api/_utils';
import { SavedCadetError, saveCadet } from '../../lib/savedCadets';
import { _resetRateLimits } from '../../lib/rateLimit';
import { POST } from '../../app/api/cadets/save/route';

const SECRET = '246801';
const body = (o = {}) => ({ name: 'Luna', secret: SECRET, confirm: SECRET, ...o });
let spies;
beforeEach(() => {
  vi.clearAllMocks(); _resetRateLimits();
  requireActor.mockResolvedValue({ id: 5, gk: 'hash' });
  saveCadet.mockResolvedValue({ name: 'Luna' });
  spies = ['log', 'error', 'warn', 'info', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
});
afterEach(() => vi.restoreAllMocks());

const seen = async (res) => JSON.stringify([await res.clone().text(), [...res.headers.entries()], spies.map((s) => s.mock.calls)]);

describe('POST /api/cadets/save', () => {
  it('saves the caller\'s own seat and answers { ok, name } only; clears the dead seat cookie', async () => {
    const res = await POST(jsonReq(body()));
    expect(res.status).toBe(200);
    expect(await res.clone().json()).toEqual({ ok: true, name: 'Luna' });
    expect(saveCadet).toHaveBeenCalledWith({ tag: 'prisma' }, { id: 5, gk: 'hash' }, 'Luna', SECRET);
    expect(res.headers.get('set-cookie')).toMatch(/guest_seat=;/);
  });

  it('the student ID is never in a response, header or log - success or any failure', async () => {
    const outs = [await POST(jsonReq(body()))];
    outs.push(await POST(jsonReq(body({ confirm: '999999' }))));
    outs.push(await POST(jsonReq(body({ secret: '123', confirm: '123' }))));
    outs.push(await POST(jsonReq(body({ name: 'fuck' }))));
    saveCadet.mockRejectedValueOnce(new SavedCadetError('taken', 'Someone already has that name. Pick another one!'));
    outs.push(await POST(jsonReq(body())));
    saveCadet.mockRejectedValueOnce(new SavedCadetError('full', 'All 10 saved cadet spots are taken right now. You can still play as a guest! 🚀'));
    outs.push(await POST(jsonReq(body())));
    for (const r of outs) {
      const text = await seen(r);
      expect(text).not.toContain(SECRET);
      expect(text).not.toContain('999999');
    }
  });

  it('401 when not signed in; 403 for a real account (only guests can be saved)', async () => {
    requireActor.mockResolvedValue(NextResponse.json({ error: 'Not logged in' }, { status: 401 }));
    expect((await POST(jsonReq(body()))).status).toBe(401);
    requireActor.mockResolvedValue({ id: 1, gk: null });
    expect((await POST(jsonReq(body()))).status).toBe(403);
    expect(saveCadet).not.toHaveBeenCalled();
  });

  it('400 for a bad name or student ID, without touching the database', async () => {
    for (const b of [body({ name: 'B' }), body({ name: 'Braylee' }), ...['12345', '1234567', 'abcdef', '12 456', '123-456', ' 123456', '１２３４５６', '١٢٣٤٥٦', '', 123456].map((v) => body({ secret: v, confirm: v })), body({ confirm: '111111' }), {}]) {
      _resetRateLimits();
      const res = await POST(jsonReq(b));
      expect(res.status).toBe(400);
    }
    expect(saveCadet).not.toHaveBeenCalled();
  });

  it('409 with the friendly message when the spots are full', async () => {
    saveCadet.mockRejectedValue(new SavedCadetError('full', 'All 10 saved cadet spots are taken right now. You can still play as a guest! 🚀'));
    const res = await POST(jsonReq(body()));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'All 10 saved cadet spots are taken right now. You can still play as a guest! 🚀', code: 'full' });
  });

  it('409 when the name is taken, 401 when the seat was lost', async () => {
    saveCadet.mockRejectedValueOnce(new SavedCadetError('taken', 'x'));
    expect((await POST(jsonReq(body()))).status).toBe(409);
    saveCadet.mockRejectedValueOnce(new SavedCadetError('seat', 'Not logged in'));
    expect((await POST(jsonReq(body()))).status).toBe(401);
  });

  it('503 maintenance when the database is behind the code (migration not applied)', async () => {
    saveCadet.mockRejectedValue({ code: 'P2022', meta: { column: 'User.savedCadet' } });
    const res = await POST(jsonReq(body()));
    expect(res.status).toBe(503);
    expect((await res.json()).maintenance).toBe(true);
  });

  it('rate limits per IP', async () => {
    saveCadet.mockRejectedValue(new SavedCadetError('taken', 'x'));
    let last;
    for (let i = 0; i < 11; i++) last = await POST(jsonReq(body()));
    expect(last.status).toBe(429);
  });
});
