import { describe, it, expect } from 'vitest';
import { BRAYLEE_CLIPS, STREAK_CLIP_COUNTS, findClip } from '../../config/brayleeClips.mjs';
import { BRAYLEE_LINES } from '../../config/brayleeLines';
import { INTRO_SPEECH, REDUCED_SPEECH } from '../../lib/readySetGo';

const strip = (t) => t.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim();
// Every spoken variant a line can take: {n} for each streak clip count, {name} removed
const variants = (line) => {
  if (line.includes('{n}')) return STREAK_CLIP_COUNTS.map((n) => line.replace('{n}', n));
  if (line.includes('{name}')) return [line.replace(/^\{name\}[!,] ?/, '').replace(/,? ?\{name\}/, '')];
  return [line];
};

describe('BRAYLEE_CLIPS', () => {
  it('has unique ids and texts, no emoji or placeholders, and mp3 paths under public/audio/braylee', () => {
    expect(new Set(BRAYLEE_CLIPS.map((c) => c.id)).size).toBe(BRAYLEE_CLIPS.length);
    expect(new Set(BRAYLEE_CLIPS.map((c) => c.text)).size).toBe(BRAYLEE_CLIPS.length);
    for (const c of BRAYLEE_CLIPS) {
      expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(c.text).toBe(strip(c.text));
      expect(c.text).not.toMatch(/[{}]/);
      expect(c.file).toBe(`public/audio/braylee/${c.id}.mp3`);
      expect(c.url).toBe(`/audio/braylee/${c.id}.mp3`);
    }
  });
  it('covers every line in brayleeLines.js (n and name variants) plus the Ready-set-go speech', () => {
    const texts = new Set(BRAYLEE_CLIPS.map((c) => c.text));
    const needed = Object.values(BRAYLEE_LINES).flat().flatMap(variants).map(strip).concat(INTRO_SPEECH, REDUCED_SPEECH);
    for (const t of needed) expect(texts.has(t), t).toBe(true);
    expect(texts.size).toBe(new Set(needed).size); // and nothing stale
  });
});

describe('findClip', () => {
  it('matches the spoken text, ignoring emoji and spacing', () => {
    expect(findClip('Great job! 🚀')?.id).toBe('great-job');
    expect(findClip('  I knew it! ⭐ ')?.id).toBe('i-knew-it');
    expect(findClip('5 in a row! 🔥')?.id).toBe('5-in-a-row');
  });
  it('returns null for lines without a clip (unsupported streak counts, names, instructions)', () => {
    expect(findClip('7 in a row!')).toBeNull();
    expect(findClip('Welcome back, Ava!')).toBeNull();
    expect(findClip('Spell: because')).toBeNull();
    expect(findClip('')).toBeNull();
  });
});
