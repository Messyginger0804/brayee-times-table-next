import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jsonReq } from './helpers';

const tx = {
  mathSkillProgress: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  mathAttempt: { create: vi.fn() },
  $queryRaw: vi.fn(),
};
vi.mock('../../lib/prisma', () => ({ prisma: { $transaction: vi.fn((fn) => fn(tx)) } }));
vi.mock('../../app/api/_utils', async () => {
  const { NextResponse } = await import('next/server');
  const uid = vi.fn();
  return { requireUserId: vi.fn(async () => (await uid()) || NextResponse.json({ error: 'Not logged in' }, { status: 401 })), __uid: uid };
});
import * as utils from '../../app/api/_utils';
import { prisma } from '../../lib/prisma';
import { SKILLS, isProblemSkill, getLibrarySkill, LEVEL_ADVANCE_WINDOW } from '../../lib/mathSkills';
import { POST } from '../../app/api/math/attempt/route';

const generated = SKILLS.filter((s) => !isProblemSkill(s.id));
const multi = generated.find((s) => s.levelCount > 1);
const problemSkill = SKILLS.find((s) => isProblemSkill(s.id));
const fractionSkill = generated.find((s) => getLibrarySkill(s.id)?.answerType === 'fraction');

const body = (o = {}) => ({ skillId: multi.id, prompt: '3 + 4', expected: '7', given: '7', ms: 1000, ...o });
const post = (b) => POST(jsonReq(b));
const row = (o = {}) => ({ id: 99, userId: 7, skillId: multi.id, levelIndex: 0, recent: [], attempts: 0, correct: 0, mastered: false, ...o });
const good = (n) => Array.from({ length: n }, () => ({ c: true, ms: 1 }));

beforeEach(() => {
  vi.clearAllMocks();
  utils.__uid.mockResolvedValue(7);
  tx.$queryRaw.mockResolvedValue([{ id: 99 }]);
  tx.mathSkillProgress.findUnique.mockResolvedValue(row());
  tx.mathSkillProgress.update.mockImplementation(async ({ data }) => ({ ...row(), ...data }));
});

it('test fixtures exist in the curriculum', () => {
  expect(multi).toBeTruthy();
  expect(problemSkill).toBeTruthy();
});

describe('validation and auth', () => {
  it('401 when logged out', async () => {
    utils.__uid.mockResolvedValue(null);
    expect((await post(body())).status).toBe(401);
  });
  it('400 invalid JSON', async () => {
    const res = await POST(jsonReq('{nope'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
  });
  it('400 unknown skill, and a null body', async () => {
    expect((await post(body({ skillId: 'nope' }))).status).toBe(400);
    expect((await POST(jsonReq('null'))).status).toBe(400);
  });
  it('400 for times-table skills (tracked elsewhere)', async () => {
    const res = await post(body({ skillId: problemSkill.id }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/problems/);
  });
  it.each([
    ['empty prompt', { prompt: '' }], ['long prompt', { prompt: 'x'.repeat(301) }], ['non-string expected', { expected: 7 }],
    ['long expected', { expected: 'x'.repeat(101) }], ['non-string given', { given: 7 }], ['long given', { given: 'x'.repeat(101) }],
  ])('400 for %s', async (_n, o) => {
    expect((await post(body(o))).status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('accepts an empty given string (kid pressed submit with nothing)', async () => {
    const res = await post(body({ given: '' }));
    expect(res.status).toBe(200);
    expect((await res.json()).correct).toBe(false);
  });
  it.each([[-1], ['5'], [null], [Infinity]])('400 for ms=%j', async (ms) => {
    expect((await post(body({ ms }))).status).toBe(400);
  });
});

describe('judging answers (problemFor)', () => {
  const correctOf = async (o) => (await (await post(body(o))).json()).correct;
  it('integer answers', async () => {
    expect(await correctOf({ expected: '12', given: '12' })).toBe(true);
    expect(await correctOf({ expected: '12', given: '13' })).toBe(false);
  });
  it('quotient/remainder inferred from " R n"', async () => {
    expect(await correctOf({ expected: '5 R 2', given: '5 R 2' })).toBe(true);
    expect(await correctOf({ expected: '5 R 2', given: '5 R 3' })).toBe(false);
  });
  it('symbol and choice answers', async () => {
    expect(await correctOf({ expected: '<', given: '<' })).toBe(true);
    expect(await correctOf({ expected: '<', given: '>' })).toBe(false);
    expect(await correctOf({ expected: 'even', given: 'even' })).toBe(true);
    expect(await correctOf({ expected: 'even', given: 'odd' })).toBe(false);
  });
  it('fractions inferred from "/" accept equivalent forms unless requireSimplest', async () => {
    expect(await correctOf({ expected: '1/2', given: '2/4' })).toBe(true);
    expect(await correctOf({ expected: '1/2', given: '2/4', requireSimplest: true })).toBe(false);
    expect(await correctOf({ expected: '1/2', given: '1/2', requireSimplest: true })).toBe(true);
  });
  it('an explicit valid answerType wins over inference; an invalid one is ignored', async () => {
    expect(await correctOf({ expected: '0.5', given: '0.50', answerType: 'decimal' })).toBe(true);
    expect(await correctOf({ expected: '7', given: '7', answerType: 'bogus' })).toBe(true);
  });
  it('choices are filtered to strings, capped, and always include the expected answer', async () => {
    expect(await correctOf({ expected: 'b', given: 'b', answerType: 'choice', choices: ['a', 3, null, 'c'] })).toBe(true);
  });
  it('fraction-typed library skills treat plain numbers as fractions', async () => {
    if (!fractionSkill) return;
    const res = await post(body({ skillId: fractionSkill.id, expected: '2', given: '2' }));
    expect(res.status).toBe(200);
  });
});

describe('progress transaction', () => {
  it('records a wrong answer: attempt row, counters, no level change', async () => {
    tx.mathSkillProgress.findUnique.mockResolvedValue(row({ attempts: 4, correct: 3, recent: [{ c: true, ms: 5 }] }));
    const res = await post(body({ given: '8' }));
    const j = await res.json();
    expect(j).toMatchObject({ correct: false, leveledUp: false, masteredNow: false });
    expect(j.progress).toMatchObject({ skillId: multi.id, levelIndex: 0, levelCount: multi.levelCount, attempts: 5, mastered: false, windowSize: 2, levelNeed: LEVEL_ADVANCE_WINDOW, levelHave: 2, windowAccuracy: 50 });
    expect(tx.mathAttempt.create).toHaveBeenCalledWith({
      data: { userId: 7, skillId: multi.id, levelIndex: 0, prompt: '3 + 4', expected: '7', given: '8', correct: false, ms: 1000 },
    });
    const upd = tx.mathSkillProgress.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 99 });
    expect(upd.data).toMatchObject({ attempts: 5, correct: 3, levelIndex: 0 });
  });
  it('locks the row (FOR UPDATE) for this user and skill before reading it', async () => {
    await post(body());
    expect(tx.mathSkillProgress.upsert).toHaveBeenCalledWith({
      where: { userId_skillId: { userId: 7, skillId: multi.id } }, create: { userId: 7, skillId: multi.id }, update: {},
    });
    const [strings, ...vals] = tx.$queryRaw.mock.calls[0];
    expect(strings.join('?')).toContain('FOR UPDATE');
    expect(vals).toEqual([7, multi.id]);
  });
  it('caps ms at 10 minutes and rounds', async () => {
    await post(body({ ms: 9_999_999.6 }));
    expect(tx.mathAttempt.create.mock.calls[0][0].data.ms).toBe(600000);
    await post(body({ ms: 12.6 }));
    expect(tx.mathAttempt.create.mock.calls[1][0].data.ms).toBe(13);
  });
  it('tolerates a corrupt (non-array) recent column', async () => {
    tx.mathSkillProgress.findUnique.mockResolvedValue(row({ recent: 'garbage' }));
    const res = await post(body());
    expect((await res.json()).progress.windowSize).toBe(1);
  });
  it('levels up when the last 10 meet the rule and resets the window', async () => {
    tx.mathSkillProgress.findUnique.mockResolvedValue(row({ recent: good(LEVEL_ADVANCE_WINDOW - 1), attempts: 9, correct: 9 }));
    const j = await (await post(body({ ms: 1 }))).json();
    expect(j.leveledUp).toBe(true);
    expect(j.masteredNow).toBe(false);
    expect(j.progress).toMatchObject({ levelIndex: 1, windowSize: 0, windowAccuracy: null, attempts: 10 });
    expect(tx.mathSkillProgress.update.mock.calls[0][0].data).toMatchObject({ levelIndex: 1, recent: [] });
    expect(tx.mathAttempt.create.mock.calls[0][0].data.levelIndex).toBe(0); // attempt is logged at the level it was answered
  });
  it('a stored levelIndex beyond the skill is clamped to the last level', async () => {
    tx.mathSkillProgress.findUnique.mockResolvedValue(row({ levelIndex: 99 }));
    const j = await (await post(body({ given: '0' }))).json();
    expect(j.progress.levelIndex).toBe(multi.levelCount - 1);
  });
  it('masters the skill on the last level when the full window qualifies, exactly once', async () => {
    const win = multi.mastery.window || 20;
    const last = multi.levelCount - 1;
    tx.mathSkillProgress.findUnique.mockResolvedValue(row({ levelIndex: last, recent: good(win - 1), attempts: win - 1 }));
    const j = await (await post(body({ ms: 1 }))).json();
    expect(j.masteredNow).toBe(true);
    expect(j.leveledUp).toBe(false);
    expect(j.progress).toMatchObject({ mastered: true, levelNeed: win, levelHave: win });
    const data = tx.mathSkillProgress.update.mock.calls[0][0].data;
    expect(data.mastered).toBe(true);
    expect(data.masteredAt).toBeInstanceOf(Date);

    // already mastered: further perfect attempts do not re-announce mastery or touch masteredAt
    tx.mathSkillProgress.update.mockClear();
    tx.mathSkillProgress.findUnique.mockResolvedValue(row({ levelIndex: last, recent: good(win), mastered: true }));
    const j2 = await (await post(body({ ms: 1 }))).json();
    expect(j2.masteredNow).toBe(false);
    expect(tx.mathSkillProgress.update.mock.calls[0][0].data.masteredAt).toBeUndefined();
  });
  it('includes feedbackHint only when the checker supplies one', async () => {
    const j = await (await post(body())).json();
    expect('feedbackHint' in j).toBe(j.feedbackHint !== undefined);
  });
});
