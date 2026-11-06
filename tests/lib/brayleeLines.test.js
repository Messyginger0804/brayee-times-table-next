import { describe, it, expect } from 'vitest';
import { BRAYLEE_LINES, pickLine } from '../../config/brayleeLines';

const MOMENTS = ['session', 'correct', 'streak', 'levelUp', 'mastered', 'wrong', 'testPass', 'gameOver', 'spellingCorrect', 'spellingWrong', 'unlock', 'locked', 'mapNudge', 'idle', 'welcomeGuest', 'welcomeBack'];
const emojis = (t) => (t.match(/\p{Extended_Pictographic}/gu) || []).length;

describe('BRAYLEE_LINES', () => {
  it('has every moment with 4-8 short lines and at most one emoji each', () => {
    expect(Object.keys(BRAYLEE_LINES).sort()).toEqual([...MOMENTS].sort());
    for (const m of MOMENTS) {
      expect(BRAYLEE_LINES[m].length).toBeGreaterThanOrEqual(4);
      expect(BRAYLEE_LINES[m].length).toBeLessThanOrEqual(8);
      for (const l of BRAYLEE_LINES[m]) {
        expect(emojis(l), l).toBeLessThanOrEqual(1);
        expect(l.replace(/\p{Extended_Pictographic}/gu, '').trim().split(/\s+/).length, l).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('pickLine', () => {
  it('returns a line from the moment, with {n} and {name} filled', () => {
    expect(BRAYLEE_LINES.correct).toContain(pickLine('correct'));
    expect(pickLine('streak', { n: 7 })).toMatch(/7/);
    expect(pickLine('streak', { n: 7 })).not.toMatch(/[{}]/);
    expect(pickLine('welcomeBack', { name: 'Ava' })).toMatch(/Ava/);
  });
  it('never leaves a {name} placeholder when no name is given', () => {
    for (let i = 0; i < 40; i++) expect(pickLine('welcomeBack', {}, () => i / 40)).not.toMatch(/[{}]/);
  });
  it('unknown moment gives an empty string', () => {
    expect(pickLine('nope')).toBe('');
  });
  it('avoids the given line(s), for every random roll', () => {
    const all = BRAYLEE_LINES.correct;
    for (let i = 0; i < 20; i++) {
      const r = () => i / 20;
      expect(pickLine('correct', { avoid: all[0] }, r)).not.toBe(all[0]);
      expect(all.slice(1)).not.toContain(pickLine('correct', { avoid: all.slice(1) }, r));
    }
  });
  it('still answers when everything is avoided', () => {
    expect(pickLine('correct', { avoid: BRAYLEE_LINES.correct })).toBeTruthy();
  });
  it('avoid compares the filled-in text', () => {
    const a = pickLine('streak', { n: 3 }, () => 0);
    expect(pickLine('streak', { n: 3, avoid: a }, () => 0)).not.toBe(a);
  });
});
