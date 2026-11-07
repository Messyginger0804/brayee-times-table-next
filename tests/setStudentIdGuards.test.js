import { describe, it, expect } from 'vitest';
import { hostOf, isLocalDbUrl, isValidStudentId } from '../scripts/lib/studentIdGuards';

describe('hostOf', () => {
  it('parses normal, bracketed IPv6 and credentialed URLs', () => {
    expect(hostOf('postgresql://u:p@localhost:5432/db')).toBe('localhost');
    expect(hostOf('postgresql://u:p@[::1]:5432/db')).toBe('::1');
    expect(hostOf('postgresql://u:p@db.example.com/db?sslmode=require')).toBe('db.example.com');
  });
  it('returns null for unparseable or empty input', () => {
    expect(hostOf('')).toBeNull();
    expect(hostOf(undefined)).toBeNull();
    expect(hostOf('not a url')).toBeNull();
  });
});

describe('isLocalDbUrl', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('allows %s', (h) => {
    expect(isLocalDbUrl(`postgresql://u:p@${h}:5432/db`)).toBe(true);
  });
  it.each([
    'postgresql://u:p@db.example.com/db',
    'postgresql://u:p@10.0.0.5/db',
    'postgresql://u:p@localhost.example.com/db',
    'postgresql://u:p@localhost/db?host=db.example.com',
    'postgresql://u:p@localhost/db?hostaddr=10.0.0.5',
    'not a url',
    '',
    undefined,
  ])('refuses %s', (u) => {
    expect(isLocalDbUrl(u)).toBe(false);
  });
});

describe('isValidStudentId', () => {
  it('accepts exactly 7 digits, leading zero included', () => {
    expect(isValidStudentId('1234567')).toBe(true);
    expect(isValidStudentId('0123456')).toBe(true);
  });
  it.each(['1234', '12345', '123456', '12345678', '', '12 34567', '123-4567', '12345a', 'abcdefg', '１２３４５６７', '١٢٣٤٥٦٧', '1234567\n', ' 1234567'])('rejects %j', (v) => {
    expect(isValidStudentId(v)).toBe(false);
  });
  it('rejects non-strings', () => {
    expect(isValidStudentId(1234567)).toBe(false);
    expect(isValidStudentId(null)).toBe(false);
  });
});
