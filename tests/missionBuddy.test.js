import { describe, it, expect } from 'vitest';
import { buddyFor } from '../components/MissionMap';

const s = (id, state) => ({ id, state });

describe('buddyFor', () => {
  it('points at the current mission', () => {
    expect(buddyFor([s('a', 'mastered'), s('b', 'current'), s('c', 'locked')])).toEqual({ kind: 'next', id: 'b' });
  });
  it('is proud when everything is mastered', () => {
    expect(buddyFor([s('a', 'mastered'), s('b', 'mastered')])).toEqual({ kind: 'done' });
  });
  it('hides with nothing to point at', () => {
    expect(buddyFor([])).toBeNull();
    expect(buddyFor([s('a', 'locked')])).toBeNull();
  });
});
