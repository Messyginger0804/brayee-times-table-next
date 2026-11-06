import { describe, it, expect } from 'vitest';
import { isValidAnswer, isCorrectAnswer, addAttempt, progressAfterCorrect, shouldOfferUnlock } from '../components/modes/drill/attempts';

describe('drill attempts helpers', () => {
  it('validates numeric answers', () => {
    expect(isValidAnswer('')).toBe(false);
    expect(isValidAnswer('1a')).toBe(false);
    expect(isValidAnswer('12')).toBe(true);
  });
  it('grades answers', () => {
    expect(isCorrectAnswer('012', { answer: 12 })).toBe(true);
    expect(isCorrectAnswer('13', { answer: 12 })).toBe(false);
  });
  it('addAttempt prepends and caps at 5', () => {
    const card = { id: 7 };
    let s = {};
    for (let i = 0; i < 6; i++) s = addAttempt(s, card, i % 2 === 0, new Date(1000 + i));
    expect(s['7'].attempts).toHaveLength(5);
    expect(s['7'].attempts[0].id).toBe(1005);
    expect(s['7'].totalCount).toBe(5);
    expect(s['7'].correctCount).toBe(2);
  });
  it('addAttempt does not mutate input', () => {
    const s = {};
    addAttempt(s, { id: 1 }, true);
    expect(s).toEqual({});
  });
  it('progressAfterCorrect detects set completion only for new answers', () => {
    const ps = [{ id: 1 }, { id: 2 }];
    expect(progressAfterCorrect(ps[1], ps, { 1: true }).setComplete).toBe(true);
    expect(progressAfterCorrect(ps[1], ps, { 1: true, 2: true }).setComplete).toBe(false);
    expect(progressAfterCorrect(ps[0], ps, {}).setComplete).toBe(false);
    expect(progressAfterCorrect(ps[0], [], {}).setComplete).toBe(false);
  });
  it('shouldOfferUnlock', () => {
    expect(shouldOfferUnlock({ scoped: false, alreadyShown: false, count: 25 })).toBe(true);
    expect(shouldOfferUnlock({ scoped: true, alreadyShown: false, count: 25 })).toBe(false);
    expect(shouldOfferUnlock({ scoped: false, alreadyShown: true, count: 25 })).toBe(false);
    expect(shouldOfferUnlock({ scoped: false, alreadyShown: false, count: 10 })).toBe(false);
  });
});
