import { describe, it, expect } from 'vitest';
import { gcd } from '../../lib/curriculum/math/util.js';

describe('gcd', () => {
  it('terminates and returns 0 for (0,0)', () => {
    expect(gcd(0, 0)).toBe(0);
  });
  it('handles zero and negative inputs', () => {
    expect(gcd(0, 7)).toBe(7);
    expect(gcd(-12, 18)).toBe(6);
  });
  it('is unchanged for valid inputs', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(17, 5)).toBe(1);
  });
});
