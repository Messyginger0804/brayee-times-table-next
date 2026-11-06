// Real-Postgres concurrency test. Runs only when TEST_DATABASE_URL points at a LOCAL, migrated database
// (it also needs DATABASE_URL to be that same database); skipped in CI, which has no database.
// Proves the FOR SHARE lock in lib/guestWrite.js and the row lock in wipeSeat's first statement exclude each other.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { writeAs, SeatLostError } from '../lib/guestWrite';
import { wipeSeat, hashToken } from '../lib/guests';

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
  });
});
