import { describe, it, expect } from 'vitest';
import { isSchemaMissing } from '../lib/dbErrors';

describe('isSchemaMissing', () => {
  it('recognises missing column/table errors only', () => {
    expect(isSchemaMissing({ code: 'P2022' })).toBe(true);
    expect(isSchemaMissing({ code: 'P2021' })).toBe(true);
    expect(isSchemaMissing({ code: 'P2010', meta: { code: '42703' } })).toBe(true);
    expect(isSchemaMissing({ code: 'P2002' })).toBe(false);
    expect(isSchemaMissing(new Error('boom'))).toBe(false);
    expect(isSchemaMissing(null)).toBe(false);
  });
});
