import { describe, it, expect } from 'vitest';
import { shouldSignOut } from '../components/modes/shared/authLogic';
import { resolveProgress } from '../components/modes/shared/skillLogic';
import { isCorrectSpelling } from '../components/modes/shared/spellingLogic';

describe('shouldSignOut', () => {
  it('signs out only on a definite no-session answer', () => {
    for (const s of [401, 403, 404]) expect(shouldSignOut(s)).toBe(true);
  });
  it('keeps the session on network errors and 5xx', () => {
    for (const s of [0, 500, 502, 503, 504]) expect(shouldSignOut(s)).toBe(false);
  });
});

describe('resolveProgress level sync', () => {
  it('adopts the server level even without a leveledUp flag', () => {
    const r = resolveProgress({ progress: { levelHave: 2, levelNeed: 10, levelIndex: 3 } }, 2);
    expect(r.level).toBe(3);
    expect(r.leveledUp).toBe(false);
    expect(r.prog).toEqual({ have: 2, need: 10 });
  });
  it('keeps the current level when the response is missing', () => {
    expect(resolveProgress(null, 2).level).toBe(2);
  });
});

describe('isCorrectSpelling apostrophes', () => {
  it('accepts curly and modifier apostrophes', () => {
    expect(isCorrectSpelling('don’t', "don't")).toBe(true);
    expect(isCorrectSpelling('don‘t', "don't")).toBe(true);
    expect(isCorrectSpelling('donʼt', "don't")).toBe(true);
    expect(isCorrectSpelling("don't", 'don’t')).toBe(true);
  });
  it('still rejects a missing apostrophe', () => {
    expect(isCorrectSpelling('dont', "don't")).toBe(false);
  });
});
