import { describe, it, expect } from 'vitest';
import { isProfane, isReservedName, normalizeName, validateNickname, validateSecret, isValidStudentId, STUDENT_ID_LENGTH, STUDENT_ID_PATTERN, STUDENT_ID_ERROR } from '../lib/cadetNames';

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

const BAD = ['12345', '123456', '12345678', '1234a67', '12 4567', '123-4567', ' 1234567', '1234567 ', '1234567\n', '１２３４５６７', '١٢٣٤٥٦٧', ''];
describe('student ID bounds', () => {
  it('accepts exactly 7 ASCII digits only', () => {
    expect(STUDENT_ID_LENGTH).toBe(7);
    expect(STUDENT_ID_PATTERN).toBe('\\d{7}');
    expect(['1234567', '0001234', '0123456'].map(isValidStudentId)).toEqual([true, true, true]);
    for (const bad of BAD) expect(isValidStudentId(bad)).toBe(false);
    for (const bad of [1234567, null, undefined, ['1234567']]) expect(isValidStudentId(bad)).toBe(false);
  });
  it('the error asks for a student ID and never says secret number', () => {
    const e = validateSecret('1234', '1234').error;
    expect(e).toMatch(/student ID/);
    expect(e).not.toMatch(/secret number/i);
  });
});
describe('validateSecret', () => {
  it('needs exactly 7 digits, entered twice the same', () => {
    for (const id of ['1234567', '0123456', '0000000']) expect(validateSecret(id, id)).toEqual({ ok: true });
    for (const bad of [...BAD, null, undefined, 1234567, 12345.5]) expect(validateSecret(bad, bad)).toEqual({ ok: false, error: STUDENT_ID_ERROR });
    expect(STUDENT_ID_ERROR).toBe('Your student ID is 7 numbers.');
    expect(validateSecret('1234567', '1234568').ok).toBe(false);
    expect(validateSecret('1234567', 1234567).ok).toBe(false);
  });
  it('error messages never contain the digits', () => {
    expect(JSON.stringify([validateSecret('1234567', '7654321'), validateSecret('12', '12')])).not.toMatch(/1234567|7654321/);
  });
});
