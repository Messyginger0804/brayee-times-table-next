// Real-Postgres check of saved cadets. Runs only when TEST_DATABASE_URL points at a LOCAL, migrated database (it also needs DATABASE_URL to be
// that same database); skipped in CI. Creates and removes only rows it made (names prefixed "pgt-").
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { saveCadet } from '../lib/savedCadets';
import { purgeInactiveSaved } from '../lib/savedCadetPurge';
import { hashToken, wipeSeat } from '../lib/guests';
import { hashPin, verifyPin, cooldownFor } from '../lib/pinAuth';

const url = process.env.TEST_DATABASE_URL;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!url || !/localhost|127\.0\.0\.1/.test(url))('saved cadets (local Postgres)', () => {
  let db; const made = []; const tag = `pgt-${Date.now() % 100000}`;
  beforeAll(() => { db = new PrismaClient({ datasources: { db: { url } } }); });
  afterAll(async () => {
    for (const u of await db.user.findMany({ where: { name: { startsWith: 'pgt-' } } })) {
      await db.test.deleteMany({ where: { userId: u.id } });
      await db.user.delete({ where: { id: u.id } });
    }
    await db.$disconnect();
  });

  const guest = async (seat) => {
    const gk = hashToken(`${tag}-${seat}`);
    const u = await db.user.create({ data: { name: `pgt-guest-${tag}-${seat}`, isGuest: true, guestSeat: 900000 + seat + (Date.now() % 90000), guestTokenHash: gk, lastActiveAt: new Date(), level: 4 } });
    made.push(u.id);
    return { u, actor: { id: u.id, gk } };
  };

  it('converts a seat, keeps progress, hashes the ID, refills the seat; name clash is case-insensitive', async () => {
    const { u, actor } = await guest(1);
    await db.test.create({ data: { userId: u.id, score: 7 } });
    const name = `pgt-Luna${tag}`;
    await saveCadet(db, actor, name, '246801');
    const row = await db.user.findUnique({ where: { id: u.id } });
    expect(row).toMatchObject({ name, isGuest: false, guestSeat: null, guestTokenHash: null, savedCadet: true, level: 4 });
    expect(row.pin).toMatch(/^\$2[aby]\$/);
    expect(row.pin).not.toContain('246801');
    expect(await db.test.count({ where: { userId: u.id } })).toBe(1);

    const other = await guest(2);
    await expect(saveCadet(db, other.actor, name.toUpperCase(), '135790')).rejects.toMatchObject({ code: 'taken' });
    expect((await db.user.findUnique({ where: { id: other.u.id } })).isGuest).toBe(true);
  });

  it('purge deletes an idle saved cadet and all their rows (FKs without cascade included); never Braylee', async () => {
    const { u, actor } = await guest(3);
    await db.test.create({ data: { userId: u.id, score: 1 } });
    await db.attempt.create({ data: { userId: u.id, problemId: (await db.problem.findFirst()).id, isCorrect: true } });
    await saveCadet(db, actor, `pgt-Old${tag}`, '112230');
    const braylee = await db.user.findUnique({ where: { name: 'Braylee' } });
    const before = braylee && (await db.user.count({ where: { name: 'Braylee' } }));
    await db.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date(Date.now() - 31 * DAY) } }); // only this cadet is backdated
    const n = await purgeInactiveSaved(db);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await db.user.count({ where: { id: u.id } })).toBe(0);
    expect(await db.test.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.attempt.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.user.count({ where: { name: 'Braylee' } })).toBe(before);
  });

  it('mission unlocks survive save and a later sign-in, and are deleted by the purge', async () => {
    const { u, actor } = await guest(5);
    await db.skillUnlock.createMany({ data: [{ userId: u.id, skillId: 'pgt-a' }, { userId: u.id, skillId: 'pgt-b' }] });
    await saveCadet(db, actor, `pgt-Unl${tag}`, '55667');
    expect(await db.skillUnlock.count({ where: { userId: u.id } })).toBe(2); // survived the save
    expect((await verifyPin(`pgt-Unl${tag}`, '55667')).ok).toBe(true); // resume
    expect(await db.skillUnlock.count({ where: { userId: u.id } })).toBe(2);
    await db.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date(Date.now() - 31 * DAY) } });
    await purgeInactiveSaved(db);
    expect(await db.user.count({ where: { id: u.id } })).toBe(0);
    expect(await db.skillUnlock.count({ where: { userId: u.id } })).toBe(0);
  });

  it('a wiped guest seat loses its unlocks', async () => {
    const { u, actor } = await guest(6);
    await db.skillUnlock.create({ data: { userId: u.id, skillId: 'pgt-w' } });
    expect(await wipeSeat(db, u.id, {}, { guestTokenHash: actor.gk })).toBe(true);
    expect(await db.skillUnlock.count({ where: { userId: u.id } })).toBe(0);
  });

  const savedCount = () => db.user.count({ where: { savedCadet: true } });

  it('cap race: two saves at max-1 fire together, exactly one wins and one gets "full"', async () => {
    process.env.SAVED_CADETS_MAX = String((await savedCount()) + 1);
    try {
      const [a, b] = [await guest(10), await guest(11)];
      const r = await Promise.allSettled([
        saveCadet(db, a.actor, `pgt-RaceA${tag}`, '111111'),
        saveCadet(db, b.actor, `pgt-RaceB${tag}`, '222222'),
      ]);
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      const lost = r.find((x) => x.status === 'rejected');
      expect(lost.reason).toMatchObject({ code: 'full' });
      expect(await savedCount()).toBe(Number(process.env.SAVED_CADETS_MAX));
    } finally { delete process.env.SAVED_CADETS_MAX; }
  });

  it('save racing a wipe of the same seat: either the cadet is saved and keeps its rows, or the save fails with "seat" and the rows are gone', async () => {
    for (let i = 0; i < 4; i++) {
      const { u, actor } = await guest(20 + i);
      await db.test.create({ data: { userId: u.id, score: i } });
      const [save, wipe] = await Promise.allSettled([
        saveCadet(db, actor, `pgt-W${i}${tag}`, '333333'),
        wipeSeat(db, u.id, {}, { guestTokenHash: actor.gk }),
      ]);
      const row = await db.user.findUnique({ where: { id: u.id } });
      const rows = await db.test.count({ where: { userId: u.id } });
      if (save.status === 'fulfilled') {
        expect(wipe.value).toBe(false); // the wipe found the token gone
        expect(row.savedCadet).toBe(true); expect(rows).toBe(1);
      } else {
        expect(save.reason).toMatchObject({ code: 'seat' });
        expect(row).toMatchObject({ savedCadet: false, isGuest: true, guestTokenHash: null }); expect(rows).toBe(0);
      }
    }
  });

  it('purge row lock: a cadet who is active again after the stale read is not deleted', async () => {
    const { actor, u } = await guest(30);
    await saveCadet(db, actor, `pgt-Lock${tag}`, '444444');
    await db.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date(Date.now() - 31 * DAY) } });
    const racing = new Proxy(db, { get: (t, k) => (k === 'user' ? new Proxy(t.user, { get: (x, kk) => (kk === 'findMany' ? async (a) => { const r = await x.findMany(a); await x.update({ where: { id: u.id }, data: { lastActiveAt: new Date() } }); return r; } : x[kk]) }) : t[k]) });
    await purgeInactiveSaved(racing);
    expect(await db.user.count({ where: { id: u.id } })).toBe(1);
  });

  it.each([[4, 5], [9, 10], [14, 15], [19, 20], [24, 25], [40, 41]])('lockout SQL: the wrong try after %i misses rests the account for cooldownFor(%i+1) seconds', async (before, n) => {
    const row = await db.user.create({ data: { name: `pgt-Esc${before}${tag}`, pin: await hashPin('123456'), savedCadet: true, savedAt: new Date(), lastActiveAt: new Date(), failedLoginAttempts: before } });
    const r = await verifyPin(row.name, '999999');
    expect(r).toMatchObject({ ok: false, status: 401 });
    const after = await db.user.findUnique({ where: { id: row.id } });
    const secs = (after.lockedUntil.getTime() - Date.now()) / 1000;
    expect(after.failedLoginAttempts).toBe(before + 1);
    expect(secs).toBeGreaterThan(cooldownFor(n) - 10);
    expect(secs).toBeLessThanOrEqual(cooldownFor(n) + 1);
    expect([86400, 7200, 1800, 300, 60]).toContain(cooldownFor(n));
    expect((await verifyPin(row.name, '123456')).ok).toBe(false); // resting: even the right secret is refused
  });
});
