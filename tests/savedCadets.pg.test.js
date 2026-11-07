// Real-Postgres check of saved cadets. Runs only when TEST_DATABASE_URL points at a LOCAL, migrated database (it also needs DATABASE_URL to be
// that same database); skipped in CI. Creates and removes only rows it made (names prefixed "pgt-").
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { saveCadet } from '../lib/savedCadets';
import { purgeInactiveSaved } from '../lib/savedCadetPurge';
import { hashToken } from '../lib/guests';

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
    await saveCadet(db, actor, name, '24680');
    const row = await db.user.findUnique({ where: { id: u.id } });
    expect(row).toMatchObject({ name, isGuest: false, guestSeat: null, guestTokenHash: null, savedCadet: true, level: 4 });
    expect(row.pin).toMatch(/^\$2[aby]\$/);
    expect(row.pin).not.toContain('24680');
    expect(await db.test.count({ where: { userId: u.id } })).toBe(1);

    const other = await guest(2);
    await expect(saveCadet(db, other.actor, name.toUpperCase(), '13579')).rejects.toMatchObject({ code: 'taken' });
    expect((await db.user.findUnique({ where: { id: other.u.id } })).isGuest).toBe(true);
  });

  it('purge deletes an idle saved cadet and all their rows (FKs without cascade included); never Braylee', async () => {
    const { u, actor } = await guest(3);
    await db.test.create({ data: { userId: u.id, score: 1 } });
    await db.attempt.create({ data: { userId: u.id, problemId: (await db.problem.findFirst()).id, isCorrect: true } });
    await saveCadet(db, actor, `pgt-Old${tag}`, '11223');
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
});
