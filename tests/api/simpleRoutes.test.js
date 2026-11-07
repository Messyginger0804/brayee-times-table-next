import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { jsonReq, getReq } from './helpers';

vi.mock('../../lib/prisma', () => {
  const prisma = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    problem: { findMany: vi.fn(), update: vi.fn() },
    userProblem: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    attempt: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    test: { create: vi.fn() },
    $queryRaw: vi.fn(),
  };
  prisma.$transaction = vi.fn((fn) => fn(prisma)); // writes run through lib/guestWrite.js
  return { prisma };
});
vi.mock('../../app/api/_utils', async () => {
  const { NextResponse: NR } = await import('next/server');
  const getUserId = vi.fn();
  return {
    getUserId,
    requireActor: vi.fn(async () => {
      const id = await getUserId();
      return id ? { id, gk: null } : NR.json({ error: 'Not logged in' }, { status: 401 });
    }),
    requireUserId: vi.fn(async () => (await getUserId()) || NR.json({ error: 'Not logged in' }, { status: 401 })),
    requireProblemRequest: vi.fn(async (params) => {
      const userId = await getUserId();
      if (!userId) return { error: NR.json({ error: 'Not logged in' }, { status: 401 }) };
      const problemId = parseInt(params.id, 10);
      if (!Number.isInteger(problemId)) return { error: NR.json({ error: 'Invalid problem id' }, { status: 400 }) };
      return { userId, actor: { id: userId, gk: null }, problemId };
    }),
  };
});
vi.mock('../../lib/skillState', () => ({ buildSkillStates: vi.fn() }));
vi.mock('../../lib/pinAuth', () => ({ verifyPin: vi.fn() }));

import { prisma } from '../../lib/prisma';
import { getUserId } from '../../app/api/_utils';
import { buildSkillStates } from '../../lib/skillState';
import { verifyPin } from '../../lib/pinAuth';
import { POST as levelPOST } from '../../app/api/users/level/route';
import { GET as curriculumGET } from '../../app/api/curriculum/me/route';
import { PUT as gradePUT } from '../../app/api/me/grade/route';
import { POST as loginPOST } from '../../app/api/auth/login/route';
import { POST as attemptPOST } from '../../app/api/problems/[id]/attempt/route';
import { GET as last5GET } from '../../app/api/attempts/last5/route';

beforeEach(() => { vi.clearAllMocks(); getUserId.mockResolvedValue(7); });
const loggedOut = () => getUserId.mockResolvedValue(null);

describe('POST /api/users/level', () => {
  it('401 when logged out', async () => {
    loggedOut();
    expect((await levelPOST(jsonReq({ level: 1 }))).status).toBe(401);
  });
  it.each([[0], [3], ['x'], [null]])('400 for level %j', async (level) => {
    const res = await levelPOST(jsonReq({ level }));
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('400 for unparsable body', async () => {
    expect((await levelPOST(jsonReq('not json'))).status).toBe(400);
  });
  it('level 1 updates directly', async () => {
    prisma.user.update.mockResolvedValue({ id: 7, name: 'K', level: 1, image: null });
    const res = await levelPOST(jsonReq({ level: '1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 7, name: 'K', level: 1, image: null });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { level: 1 } });
  });
  it('level 2 is refused until every level-1 (a,b <= 5) problem was ever answered correctly', async () => {
    prisma.problem.findMany.mockResolvedValue([
      { id: 1, problem: '2 x 3' }, { id: 2, problem: '5 x 5' }, { id: 3, problem: '6 x 2' }, { id: 4, problem: '3 x 9' },
    ]);
    prisma.userProblem.findMany.mockResolvedValue([{ problemId: 1 }]); // 2 of 2 needed -> only 1 done
    const res = await levelPOST(jsonReq({ level: 2 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Level 1/);
    expect(prisma.userProblem.findMany.mock.calls[0][0].where).toEqual({ userId: 7, problemId: { in: [1, 2] }, everCorrect: true });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('level 2 unlocks when all level-1 problems are done', async () => {
    prisma.problem.findMany.mockResolvedValue([{ id: 1, problem: '2 x 3' }, { id: 3, problem: '6 x 2' }]);
    prisma.userProblem.findMany.mockResolvedValue([{ problemId: 1 }]);
    prisma.user.update.mockResolvedValue({ id: 7, name: 'K', level: 2, image: 'i' });
    const res = await levelPOST(jsonReq({ level: 2 }));
    expect(res.status).toBe(200);
    expect((await res.json()).level).toBe(2);
  });
  it('500 when the database throws', async () => {
    prisma.user.update.mockRejectedValue(new Error('db'));
    const res = await levelPOST(jsonReq({ level: 1 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to update level' });
  });
});

describe('GET /api/curriculum/me', () => {
  const url = (q = '') => getReq(`http://localhost/api/curriculum/me${q}`);
  it('401 when logged out', async () => {
    loggedOut();
    expect((await curriculumGET(url())).status).toBe(401);
  });
  it('404 when the user row is gone', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect((await curriculumGET(url())).status).toBe(404);
  });
  it('defaults to the kid\'s own grade', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, name: 'K', grade: 3 });
    buildSkillStates.mockResolvedValue([{ id: 's' }]);
    const res = await curriculumGET(url());
    expect(await res.json()).toEqual({ grade: 3, shownGrade: 3, skills: [{ id: 's' }] });
    expect(buildSkillStates).toHaveBeenCalledWith(7, 3);
  });
  it('?grade=all shows every grade; ?grade= (empty) keeps the default', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, grade: 3 });
    buildSkillStates.mockResolvedValue([]);
    expect((await (await curriculumGET(url('?grade=all'))).json()).shownGrade).toBeNull();
    expect((await (await curriculumGET(url('?grade='))).json()).shownGrade).toBe(3);
  });
  it('?grade=5 overrides the kid\'s grade', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, grade: 3 });
    buildSkillStates.mockResolvedValue([]);
    const body = await (await curriculumGET(url('?grade=5'))).json();
    expect(body).toMatchObject({ grade: 3, shownGrade: 5 });
  });
  it.each([['0'], ['7'], ['2.5'], ['abc']])('400 for ?grade=%s', async (g) => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, grade: 3 });
    expect((await curriculumGET(url(`?grade=${g}`))).status).toBe(400);
    expect(buildSkillStates).not.toHaveBeenCalled();
  });
});

describe('PUT /api/me/grade', () => {
  it('401 when logged out', async () => {
    loggedOut();
    expect((await gradePUT(jsonReq({ grade: 2 }, undefined, 'PUT'))).status).toBe(401);
  });
  it.each([[0], [7], [1.5], ['x'], [undefined]])('400 for grade %j', async (grade) => {
    expect((await gradePUT(jsonReq({ grade }))).status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('updates only the caller\'s row', async () => {
    prisma.user.update.mockResolvedValue({ grade: 4 });
    const res = await gradePUT(jsonReq({ grade: '4' }));
    expect(await res.json()).toEqual({ grade: 4 });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { grade: 4 }, select: { grade: true } });
  });
});

describe('POST /api/auth/login', () => {
  it.each([[{}], [{ name: 'K' }], [{ pin: '12345' }], [{ name: '  ', pin: '12345' }]])('400 for %j', async (b) => {
    expect((await loginPOST(jsonReq(b))).status).toBe(400);
    expect(verifyPin).not.toHaveBeenCalled();
  });
  it('400 for non-JSON body', async () => {
    expect((await loginPOST(jsonReq('zzz'))).status).toBe(400);
  });
  it('returns the public user fields only', async () => {
    verifyPin.mockResolvedValue({ ok: true, user: { id: 1, name: 'K', level: 2, image: 'i', pin: 'SECRET', failedLoginAttempts: 0 } });
    const res = await loginPOST(jsonReq({ name: 'K', pin: '12345' }));
    expect(await res.json()).toEqual({ id: 1, name: 'K', level: 2, image: 'i' });
  });
  it('bad credentials -> 401', async () => {
    verifyPin.mockResolvedValue({ ok: false, status: 401, error: 'Invalid name or PIN' });
    const res = await loginPOST(jsonReq({ name: 'K', pin: '99999' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('Retry-After')).toBeNull();
  });
  it('a 400 from verifyPin (malformed pin) is reported as 401', async () => {
    verifyPin.mockResolvedValue({ ok: false, status: 400, error: 'Name and your student ID (5 to 8 digits) required' });
    expect((await loginPOST(jsonReq({ name: 'K', pin: 'abc' }))).status).toBe(401);
  });
  it('lockout -> 429 with Retry-After header and body', async () => {
    verifyPin.mockResolvedValue({ ok: false, status: 429, error: 'break', retryAfter: 42 });
    const res = await loginPOST(jsonReq({ name: 'K', pin: '12345' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    expect(await res.json()).toEqual({ error: 'break', retryAfter: 42 });
  });
});

describe('POST /api/problems/[id]/attempt', () => {
  const call = (body, id = '5') => attemptPOST(jsonReq(body), { params: { id } });
  beforeEach(() => {
    prisma.attempt.findMany.mockResolvedValue([]);
    prisma.attempt.create.mockResolvedValue({});
    prisma.problem.update.mockResolvedValue({});
  });
  it('401 when logged out', async () => {
    loggedOut();
    expect((await call({ correct: true })).status).toBe(401);
  });
  it('400 for a bad id', async () => {
    expect((await call({ correct: true }, 'abc')).status).toBe(400);
  });
  it.each([[{}], [{ correct: 'true' }], [{ correct: 1 }]])('400 when correct is not a boolean: %j', async (b) => {
    expect((await call(b)).status).toBe(400);
    expect(prisma.attempt.create).not.toHaveBeenCalled();
  });
  it('correct answer: records, trims to 5, bumps counter, upserts mastered from the last 3', async () => {
    prisma.attempt.findMany
      .mockResolvedValueOnce([{ id: 11 }, { id: 12 }]) // beyond the newest 5
      .mockResolvedValueOnce([{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }]);
    const res = await call({ correct: true });
    expect(await res.json()).toEqual({ success: true });
    expect(prisma.attempt.create).toHaveBeenCalledWith({ data: { problemId: 5, userId: 7, isCorrect: true } });
    expect(prisma.attempt.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [11, 12] } } });
    expect(prisma.problem.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { correct: { increment: 1 } } });
    expect(prisma.userProblem.upsert).toHaveBeenCalledWith({
      where: { userId_problemId: { userId: 7, problemId: 5 } },
      update: { everCorrect: true, mastered: true },
      create: { userId: 7, problemId: 5, everCorrect: true, mastered: true },
    });
  });
  it('correct but streak too short: not mastered, and no delete when nothing to trim', async () => {
    prisma.attempt.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ isCorrect: true }, { isCorrect: false }]);
    await call({ correct: true });
    expect(prisma.attempt.deleteMany).not.toHaveBeenCalled();
    expect(prisma.userProblem.upsert.mock.calls[0][0].update.mastered).toBe(false);
  });
  it('wrong answer: bumps incorrect and clears mastered', async () => {
    prisma.attempt.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ isCorrect: false }]);
    await call({ correct: false });
    expect(prisma.problem.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { incorrect: { increment: 1 } } });
    expect(prisma.userProblem.updateMany).toHaveBeenCalledWith({ where: { userId: 7, problemId: 5 }, data: { mastered: false } });
    expect(prisma.userProblem.upsert).not.toHaveBeenCalled();
  });
  it('500 when the database throws', async () => {
    prisma.attempt.create.mockRejectedValue(new Error('db'));
    const res = await call({ correct: true });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/attempts/last5', () => {
  it('401 when logged out', async () => {
    loggedOut();
    expect((await last5GET()).status).toBe(401);
  });
  it('groups per problem, keeps only the first 5 (newest) and counts correct ones', async () => {
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push({ id: i, problemId: 1, isCorrect: i % 2 === 0, createdAt: 'd' });
    rows.push({ id: 100, problemId: 2, isCorrect: false, createdAt: 'd' });
    prisma.attempt.findMany.mockResolvedValue(rows);
    const { summaries } = await (await last5GET()).json();
    expect(summaries['1'].attempts.map((a) => a.id)).toEqual([0, 1, 2, 3, 4]);
    expect(summaries['1']).toMatchObject({ correctCount: 3, totalCount: 5 });
    expect(summaries['2']).toMatchObject({ correctCount: 0, totalCount: 1 });
    expect(prisma.attempt.findMany.mock.calls[0][0].where).toEqual({ userId: 7 });
  });
  it('empty -> empty summaries', async () => {
    prisma.attempt.findMany.mockResolvedValue([]);
    expect(await (await last5GET()).json()).toEqual({ summaries: {} });
  });
  it('500 on db failure', async () => {
    prisma.attempt.findMany.mockRejectedValue(new Error('x'));
    expect((await last5GET()).status).toBe(500);
  });
});

it('sanity: NextResponse is the real one', () => expect(NextResponse.json({}).status).toBe(200));
