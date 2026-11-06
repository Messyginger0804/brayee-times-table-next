import { describe, it, expect } from 'vitest';
import { queueCadetWelcome, takeCadetWelcome, cadetWelcomeTitle } from '../lib/cadetWelcome';

const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

describe('cadet welcome hand-off', () => {
  it('shows once per queue', () => {
    const s = memStore();
    queueCadetWelcome(s, { label: '003', kind: 'claim' });
    expect(takeCadetWelcome(s)).toEqual({ label: '003', kind: 'claim' });
    expect(takeCadetWelcome(s)).toBeNull();
  });
  it('ignores bad input and corrupt storage', () => {
    const s = memStore();
    queueCadetWelcome(s, { label: '', kind: 'claim' });
    queueCadetWelcome(s, { label: '003', kind: 'other' });
    expect(takeCadetWelcome(s)).toBeNull();
    s.setItem('cadetWelcome', '{nope');
    expect(takeCadetWelcome(s)).toBeNull();
  });
  it('words the title per kind', () => {
    expect(cadetWelcomeTitle({ label: '003', kind: 'claim' })).toBe('🚀 Welcome aboard, Cadet 003!');
    expect(cadetWelcomeTitle({ label: '003', kind: 'resume' })).toBe('Welcome back, Cadet 003! 🚀');
  });
});
