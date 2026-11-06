import { describe, it, expect, vi, afterEach } from 'vitest';
import { isSchemaMissing, NEW_QUALIFIED_COLUMNS, NEW_TABLES } from '../lib/dbErrors';

afterEach(() => vi.restoreAllMocks());

describe('isSchemaMissing', () => {
  it('matches P2022 / P2021 only when they name a column or table from this PR', () => {
    expect(isSchemaMissing({ code: 'P2022', meta: { column: 'User.isGuest' } })).toBe(true);
    expect(isSchemaMissing({ code: 'P2022', message: 'The column `User.grade` does not exist in the current database.' })).toBe(true);
    expect(isSchemaMissing({ code: 'P2022', meta: { column: 'SpellingWord.unitId' } })).toBe(true);
    expect(isSchemaMissing({ code: 'P2021', meta: { table: 'public.MathAttempt' } })).toBe(true);
    expect(isSchemaMissing({ code: 'P2021', message: 'The table `public.MathSkillProgress` does not exist' })).toBe(true);
    // old, unrelated or generic: real errors must surface
    expect(isSchemaMissing({ code: 'P2022', meta: { column: 'User.nickname' } })).toBe(false);
    expect(isSchemaMissing({ code: 'P2022', meta: { column: 'Problem.grade' } })).toBe(false);
    expect(isSchemaMissing({ code: 'P2021', meta: { table: 'public.Widget' } })).toBe(false);
    expect(isSchemaMissing({ code: 'P2022' })).toBe(false);
  });

  it('matches P2010 only for a Postgres "does not exist" error naming one of them', () => {
    expect(isSchemaMissing({ code: 'P2010', meta: { code: '42703', message: 'column "isGuest" does not exist' } })).toBe(true);
    expect(isSchemaMissing({ code: 'P2010', message: 'Raw query failed. Code: `42P01`. Message: `relation "MathAttempt" does not exist`' })).toBe(true);
    expect(isSchemaMissing({ code: 'P2010', meta: { code: '42703', message: 'column "somethingElse" does not exist' } })).toBe(false);
    expect(isSchemaMissing({ code: 'P2010', meta: { code: '23505', message: 'duplicate key value violates "guestSeat"' } })).toBe(false);
    expect(isSchemaMissing({ code: 'P2010', meta: { code: '57014', message: 'canceling statement due to timeout on isGuest' } })).toBe(false);
  });

  it('rethrows everything else (returns false) and ignores non-Prisma errors', () => {
    for (const e of [{ code: 'P2002' }, { code: 'P1001' }, new Error('The column `User.isGuest` does not exist'), null, undefined]) {
      expect(isSchemaMissing(e)).toBe(false);
    }
  });

  it('logs the code and identifier only, never the raw message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    isSchemaMissing({ code: 'P2022', meta: { column: 'User.isGuest' }, message: 'secret-value-123 The column `User.isGuest` does not exist' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0].join(' ')).toBe('[schema-not-migrated] P2022 User.isGuest');
  });

  it('the identifier lists are non-empty', () => {
    expect(NEW_QUALIFIED_COLUMNS.length).toBeGreaterThan(0);
    expect(NEW_TABLES).toContain('MathAttempt');
  });
});
