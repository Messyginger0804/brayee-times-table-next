import { describe, it, expect } from 'vitest';
import { specialToken, physicalSpecialKey } from '../components/game/keypadRules';

describe('specialToken', () => {
  it('minus only on empty value', () => {
    expect(specialToken('-', '')).toBe('-');
    expect(specialToken('-', '5')).toBeNull();
  });
  it('decimal rules', () => {
    expect(specialToken('.', '')).toBe('0.');
    expect(specialToken('.', '3')).toBe('.');
    expect(specialToken('.', '3.1')).toBeNull();
    expect(specialToken('.', '1 2')).toBe('.');
    expect(specialToken('.', '1 R ')).toBe('0.');
    expect(specialToken('.', '1/2.5')).toBeNull();
  });
  it('fraction bar needs trailing digit and no slash', () => {
    expect(specialToken('/', '3')).toBe('/');
    expect(specialToken('/', '')).toBeNull();
    expect(specialToken('/', '3/4')).toBeNull();
    expect(specialToken('/', '3.')).toBeNull();
  });
  it('mixed space', () => {
    expect(specialToken(' ', '1')).toBe(' ');
    expect(specialToken(' ', '1 ')).toBeNull();
    expect(specialToken(' ', '1/2')).toBeNull();
  });
  it('remainder', () => {
    expect(specialToken('R', '7')).toBe(' R ');
    expect(specialToken('R', '7 R 1')).toBeNull();
    expect(specialToken('R', '')).toBeNull();
  });
  it('unknown keys', () => {
    expect(specialToken('x', '1')).toBeNull();
    expect(specialToken('constructor', '1')).toBeNull();
  });
});

describe('physicalSpecialKey', () => {
  it('maps allowed keys', () => {
    for (const k of ['-', '.', '/', ' ']) expect(physicalSpecialKey(k)).toBe(k);
    expect(physicalSpecialKey('r')).toBe('R');
    expect(physicalSpecialKey('R')).toBe('R');
  });
  it('rejects others', () => {
    expect(physicalSpecialKey('a')).toBeNull();
    expect(physicalSpecialKey('Enter')).toBeNull();
    expect(physicalSpecialKey('toString')).toBeNull();
  });
});
