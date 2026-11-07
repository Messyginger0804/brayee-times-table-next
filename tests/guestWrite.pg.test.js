// Real-Postgres concurrency test. Runs only when TEST_DATABASE_URL points at a LOCAL, migrated database
// (it also needs DATABASE_URL to be that same database); skipped in CI, which has no database.
// Proves the FOR SHARE lock in lib/guestWrite.js and the row lock in wipeSeat's first statement exclude each other.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { writeAs, SeatLostError } from '../lib/guestWrite';
import { wipeSeat, hashToken } from '../lib/guests';
import { buildSkillStates } from '../lib/skillState';
import { SKILLS } from '../lib/mathSkills';

const url = process.env.TEST_DATABASE_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!url || !/localhost|127\.0\.0\.1/.test(url))('guest write vs wipe (local Postgres)', () => {
  let db; let user; let hash;
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    hash = hashToken(`pg-test-${Math.random()}`);
    user = await db.user.create({ data: { name: `Guest pgtest ${Date.now()}`, isGuest: true, guestSeat: 100000 + Math.floor(Math.random() * 800000), guestTokenHash: hash, lastActiveAt: new Date() } });
  });
  afterAll(async () => {
    await db.test.deleteMany({ where: { userId: user.id } });
    await db.skillUnlock.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  });
  const rows = () => db.test.count({ where: { userId: user.id } });
  // wipeSeat on a client whose Test deletes are slow, so the wipe is "in flight" while a write arrives
  const slowWipeDb = (ms) => new Proxy(db, {
    get: (t, k) => (k === '$transaction'
      ? (fn, o) => t.$transaction((tx) => fn(new Proxy(tx, { get: (x, kk) => (kk === 'test' ? { deleteMany: async (a) => { await sleep(ms); return x.test.deleteMany(a); } } : x[kk]) })), o)
      : t[k]),
  });

  it('a write arriving while the wipe is in flight is rejected and leaves no orphan rows', async () => {
    const wipe = wipeSeat(slowWipeDb(600), user.id, { guestTokenHash: hashToken('new-owner'), lastActiveAt: new Date() }, { guestTokenHash: hash });
    await sleep(150);
    await expect(writeAs({ id: user.id, gk: hash }, (tx) => tx.test.create({ data: { userId: user.id, score: 1 } }), db)).rejects.toBeInstanceOf(SeatLostError);
    expect(await wipe).toBe(true);
    expect(await rows()).toBe(0);
    hash = hashToken('new-owner');
  });

  it('a write already in flight when the wipe starts is deleted by the wipe, not orphaned', async () => {
    const write = writeAs({ id: user.id, gk: hash }, async (tx) => { await tx.test.create({ data: { userId: user.id, score: 2 } }); await sleep(600); }, db);
    await sleep(150);
    const wipe = wipeSeat(db, user.id, { guestTokenHash: hashToken('third'), lastActiveAt: new Date() }, { guestTokenHash: hash });
    await write;
    expect(await wipe).toBe(true);
    expect(await rows()).toBe(0);
    hash = hashToken('third');
  });

  it('many parallel writes against a wipe: every surviving row belongs to a write that finished before it, none after', async () => {
    const writes = Array.from({ length: 12 }, (_, i) => sleep(i * 20).then(() => writeAs({ id: user.id, gk: hash }, (tx) => tx.test.create({ data: { userId: user.id, score: i } }), db).then(() => 'ok', (e) => (e instanceof SeatLostError ? 'lost' : Promise.reject(e)))));
    await sleep(100);
    const wipe = wipeSeat(db, user.id, { guestTokenHash: hashToken('fourth'), lastActiveAt: new Date() }, { guestTokenHash: hash });
    await Promise.all([wipe, ...writes]);
    expect(await rows()).toBe(0); // everything written before the wipe was deleted; everything after was refused
    hash = hashToken('fourth');
  });

  // buildSkillStates uses the app's prisma client (DATABASE_URL), which must be the same database as TEST_DATABASE_URL
  if (process.env.DATABASE_URL !== url) console.warn('SKIPPING persisted mission unlock tests: DATABASE_URL must equal TEST_DATABASE_URL');
  describe.skipIf(process.env.DATABASE_URL !== url)('persisted mission unlocks', () => {
    const unlocks = () => db.skillUnlock.findMany({ where: { userId: user.id }, select: { skillId: true } }).then((r) => r.map((x) => x.skillId));
    const firsts = SKILLS.filter((s) => s.order === 1).map((s) => s.id);

    it('the first state load persists the open skills (all grades) and a second load adds nothing', async () => {
      // buildSkillStates uses the app's prisma client (DATABASE_URL), which must be this same database
      await buildSkillStates(user.id, null, { id: user.id, gk: hash });
      expect(new Set(await unlocks())).toEqual(new Set(firsts));
      await buildSkillStates(user.id, null, { id: user.id, gk: hash });
      expect((await unlocks()).length).toBe(firsts.length);
    });

    it('createMany skipDuplicates is idempotent against the unique (userId, skillId)', async () => {
      const n = (await unlocks()).length;
      await db.skillUnlock.createMany({ data: [{ userId: user.id, skillId: firsts[0] }], skipDuplicates: true });
      expect((await unlocks()).length).toBe(n);
    });

    it('a persist attempted by a session that lost the seat writes nothing', async () => {
      await db.skillUnlock.deleteMany({ where: { userId: user.id } });
      await buildSkillStates(user.id, null, { id: user.id, gk: hashToken('stale-owner') });
      expect(await unlocks()).toEqual([]);
    });

    it('wiping the seat removes its unlocks, so a recycled seat starts with only the first missions', async () => {
      await db.skillUnlock.createMany({ data: [{ userId: user.id, skillId: 'extra-skill' }, { userId: user.id, skillId: firsts[0] }] });
      const next = hashToken('recycled');
      expect(await wipeSeat(db, user.id, { guestTokenHash: next, lastActiveAt: new Date() }, { guestTokenHash: hash })).toBe(true);
      hash = next;
      expect(await unlocks()).toEqual([]);
      await buildSkillStates(user.id, null, { id: user.id, gk: hash });
      expect(new Set(await unlocks())).toEqual(new Set(firsts));
    });

    it('deleting the user cascades to its unlocks', async () => {
      const u = await db.user.create({ data: { name: `Cascade pgtest ${Date.now()}` } });
      await db.skillUnlock.create({ data: { userId: u.id, skillId: 'x' } });
      await db.user.delete({ where: { id: u.id } });
      expect(await db.skillUnlock.count({ where: { userId: u.id } })).toBe(0);
    });
  });
});
