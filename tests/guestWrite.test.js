import { describe, it, expect, vi } from 'vitest';
import { writeAs, guestSafe, SeatLostError } from '../lib/guestWrite';

const mkDb = (rows) => {
  const tx = { $queryRaw: vi.fn(async () => rows), test: { create: vi.fn(async () => ({ id: 1 })) } };
  return { tx, db: { $transaction: vi.fn(async (fn) => fn(tx)) } };
};

describe('writeAs (mocked)', () => {
  it('real accounts (no gk) skip the seat check', async () => {
    const { db, tx } = mkDb([]);
    await writeAs({ id: 1, gk: null }, (t) => t.test.create({}), db);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.test.create).toHaveBeenCalled();
  });
  it('guests lock the seat row FOR SHARE with their token before writing', async () => {
    const { db, tx } = mkDb([{ ok: 1 }]);
    await writeAs({ id: 9, gk: 'hash' }, (t) => t.test.create({}), db);
    const [strings, ...vals] = tx.$queryRaw.mock.calls[0];
    expect(strings.join('?')).toMatch(/FROM "User" WHERE id = \? AND "guestTokenHash" = \? FOR SHARE/);
    expect(vals).toEqual([9, 'hash']);
    expect(tx.test.create).toHaveBeenCalled();
  });
  it('a rotated or wiped seat aborts before any write', async () => {
    const { db, tx } = mkDb([]);
    await expect(writeAs({ id: 9, gk: 'old' }, (t) => t.test.create({}), db)).rejects.toBeInstanceOf(SeatLostError);
    expect(tx.test.create).not.toHaveBeenCalled();
  });
  it('guestSafe turns a lost seat into a 401 and passes other errors through', async () => {
    const lost = await guestSafe({ id: 9, gk: 'old' }, async () => 1, mkDb([]).db);
    expect(lost.lost.status).toBe(401);
    expect((await guestSafe({ id: 1, gk: null }, async () => 42, mkDb([]).db)).value).toBe(42);
    await expect(guestSafe({ id: 1, gk: null }, async () => { throw new Error('db down'); }, mkDb([]).db)).rejects.toThrow('db down');
  });
});
