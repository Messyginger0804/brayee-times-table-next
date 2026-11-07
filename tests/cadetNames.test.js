import { describe, it, expect } from 'vitest';
import { isProfane, isReservedName, normalizeName, validateNickname, validateSecret, isValidStudentId, STUDENT_ID_MIN, STUDENT_ID_MAX } from '../lib/cadetNames';

describe('validateNickname', () => {
  it.each(['Luna', 'Mo', 'Star Girl', "O'Neil", 'Mary-Jane', 'Kim7', 'A'.repeat(16), '  Zed   Zed  '])('accepts %j', (n) => {
    const r = validateNickname(n);
    expect(r.ok).toBe(true);
    expect(r.name).toBe(normalizeName(n));
  });

  it('normalizes spaces and curly apostrophes', () => {
    expect(validateNickname('  Zed   Zed ').name).toBe('Zed Zed');
    expect(validateNickname('O’Neil').name).toBe("O'Neil");
  });

  it.each(['', 'A', 'A'.repeat(17), '-Luna', "'Luna", 'Lu_na', 'Luna!', 'Lu.na', 'a@b', 'Lüna', '😀😀', '   '])('rejects bad shape %j', (n) => {
    expect(validateNickname(n).ok).toBe(false);
  });

  it.each(['Braylee', 'braylee', 'BRAYLEE', 'Braylee 2', 'B r a y l e e', 'Guest', 'guest 007', 'Guest42', 'Cadet', 'cadet 003', 'CadetKim', 'Bray', 'bray', 'BRAY', 'B-r-a-y'])('rejects reserved name %j', (n) => {
    const r = validateNickname(n);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/saved for the game/);
  });

  it.each([
    'fuck', 'Shithead', 'b1tch', 'Big Ass', 'sh1t', 'D4MN', 'Pussycat', 'f u c k',
    // compounds, stretched letters, spacing and leetspeak bypasses
    'Dumbass', 'Asshat', 'Dickhead', 'Butthead', 'Poophead', 'Sexyboy', 'Fuuck', 'Fuuuuck', 'Phuck', 'Fuk', 'fck', 'Shiiit', 'B1tchy', 'a55', 'D1ckhead', 'p00phead', 'S h i t', 'F-u-c-k', "F'u'c'k",
  ])('rejects rude name %j', (n) => {
    expect(validateNickname(n).ok).toBe(false);
  });

  it.each(['Cassie', 'Dickson', 'Peacock', 'Class Act', 'Hello', 'Grape', 'Hellen', 'Titan', 'Skylar', 'Brayden', 'Glass', 'Grass', 'Bass', 'Assemble', 'Classy', 'Buttercup', 'Essex', 'Dickens', 'Sexton', 'Passion', 'Mass', 'Lassie'])('does not trip on harmless %j', (n) => {
    expect(validateNickname(n).ok).toBe(true);
  });

  it('is never fooled by case', () => {
    expect(isReservedName('GUEST 1')).toBe(true);
    expect(isProfane('FUCK')).toBe(true);
  });
});

describe('student ID bounds', () => {
  it('accepts 5 to 8 digits only', () => {
    expect([STUDENT_ID_MIN, STUDENT_ID_MAX]).toEqual([5, 8]);
    expect(['1234', '12345', '12345678', '123456789'].map(isValidStudentId)).toEqual([false, true, true, false]);
    expect(isValidStudentId('1234a')).toBe(false);
    expect(isValidStudentId(12345)).toBe(false);
  });
  it('the error asks for a student ID and never says secret number', () => {
    const e = validateSecret('1234', '1234').error;
    expect(e).toMatch(/student ID/);
    expect(e).not.toMatch(/secret number/i);
  });
});
describe('validateSecret', () => {
  it('needs 5 to 8 digits, entered twice the same', () => {
    expect(validateSecret('12345', '12345')).toEqual({ ok: true });
    for (const id of ['12345', '1234567', '98765432']) expect(validateSecret(id, id)).toEqual({ ok: true });
    for (const bad of ['1234', '123456789', 'abcde', '12 45', '', null, undefined, 12345.5]) expect(validateSecret(bad, bad).ok).toBe(false);
    expect(validateSecret('12345', '12346').ok).toBe(false);
  });
  it('error messages never contain the digits', () => {
    expect(JSON.stringify([validateSecret('12345', '54321'), validateSecret('12', '12')])).not.toMatch(/12345|54321/);
  });
});
