import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { speakCheer, speakSpelling, setMuted, isMuted, pickVoice, resetCheerVoice, CHEER_GAP_MS, CHEER_SETTLE_MS, MUTE_KEY } from '../../lib/cheerVoice';

let synth;
let spoken;
beforeEach(() => {
  vi.useFakeTimers();
  spoken = [];
  const store = {};
  vi.stubGlobal('localStorage', { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } });
  synth = {
    speaking: false,
    cancel: vi.fn(() => { synth.speaking = false; }),
    getVoices: () => [{ name: 'Fred', lang: 'de-DE' }, { name: 'Samantha', lang: 'en-US' }],
    speak: vi.fn((u) => { spoken.push(u); synth.speaking = true; }),
  };
  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal('SpeechSynthesisUtterance', function Utt(t) { this.text = t; });
  resetCheerVoice();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const flush = () => vi.advanceTimersByTime(CHEER_SETTLE_MS + 1);
const finish = () => { synth.speaking = false; };

describe('speakCheer', () => {
  it('speaks after a short delay with a bright voice, higher pitch and rate, without emoji', () => {
    speakCheer('Great job! 🚀');
    expect(synth.speak).not.toHaveBeenCalled();
    flush();
    const u = spoken[0];
    expect(u.text).toBe('Great job!');
    expect(u.voice.name).toBe('Samantha');
    expect(u.pitch).toBeGreaterThan(1);
    expect(u.rate).toBeGreaterThan(1);
  });
  it('a later cheer in the same moment replaces the pending one', () => {
    speakCheer('Yes!');
    speakCheer('5 in a row!');
    flush();
    expect(spoken.map((u) => u.text)).toEqual(['5 in a row!']);
  });
  it('throttles to one cheer per gap', () => {
    speakCheer('One'); flush(); finish();
    vi.advanceTimersByTime(1000);
    speakCheer('Two'); flush();
    expect(spoken).toHaveLength(1);
    vi.advanceTimersByTime(CHEER_GAP_MS);
    speakCheer('Three'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['One', 'Three']);
  });
  it('never overlaps a cheer that is still playing', () => {
    speakCheer('One'); flush();
    vi.advanceTimersByTime(CHEER_GAP_MS + 100);
    speakCheer('Two'); flush();
    expect(spoken).toHaveLength(1);
  });
  it('ignores empty text and emoji-only text', () => {
    speakCheer(''); speakCheer('🚀'); flush();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('is silent without speechSynthesis', () => {
    vi.stubGlobal('window', {});
    expect(() => { speakCheer('Hi'); speakSpelling('word'); flush(); }).not.toThrow();
    vi.stubGlobal('window', undefined);
    expect(() => speakCheer('Hi')).not.toThrow();
  });
});

describe('mute', () => {
  it('defaults to on (not muted), persists, and stops cheers', () => {
    expect(isMuted()).toBe(false);
    speakCheer('Pending'); setMuted(true);
    flush();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(localStorage.getItem(MUTE_KEY)).toBe('1');
    speakCheer('Muted'); flush();
    expect(synth.speak).not.toHaveBeenCalled();
    setMuted(false);
    speakCheer('Back'); flush();
    expect(spoken[0].text).toBe('Back');
  });
  it('reads a stored mute on first use', () => {
    localStorage.setItem(MUTE_KEY, '1');
    resetCheerVoice();
    expect(isMuted()).toBe(true);
  });
  it('cancels a playing cheer on mute', () => {
    speakCheer('Hey'); flush();
    setMuted(true);
    expect(synth.cancel).toHaveBeenCalled();
  });
  it('muting never cancels or blocks spelling words', () => {
    setMuted(true);
    synth.cancel.mockClear();
    speakSpelling('Spell: cat');
    expect(spoken[0].text).toBe('Spell: cat');
    synth.cancel.mockClear();
    setMuted(true);
    expect(synth.cancel).not.toHaveBeenCalled();
  });
});

describe('spelling priority', () => {
  it('cancels a pending cheer and any playing speech', () => {
    speakCheer('Yes!');
    speakSpelling('Spell: dog');
    flush();
    expect(spoken.map((u) => u.text)).toEqual(['Spell: dog']);
    expect(synth.cancel).toHaveBeenCalled();
  });
  it('no cheer starts while a spelling utterance plays, even if the engine reports idle', () => {
    speakSpelling('A sentence.');
    synth.speaking = false;
    speakCheer('Great!'); flush();
    expect(spoken).toHaveLength(1);
  });
  it('cheers resume after the spelling utterance ends', () => {
    speakSpelling('Spell: cat');
    spoken[0].onend(); finish();
    speakCheer('Great!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Spell: cat', 'Great!']);
  });
  it('cheers resume after a spelling error or a lost end event', () => {
    speakSpelling('Spell: cat'); spoken[0].onerror(); finish();
    speakCheer('One'); flush();
    expect(spoken).toHaveLength(2);
    resetCheerVoice();
    speakSpelling('Spell: hat'); finish();
    vi.advanceTimersByTime(16000);
    speakCheer('Two'); flush();
    expect(spoken.at(-1).text).toBe('Two');
  });
});

describe('pickVoice', () => {
  it('prefers bright names, then en-US, then any English, else null', () => {
    expect(pickVoice([{ name: 'X', lang: 'en-GB' }, { name: 'Google US English', lang: 'en-US' }]).name).toBe('Google US English');
    expect(pickVoice([{ name: 'X', lang: 'en-GB' }, { name: 'Y', lang: 'en-US' }]).name).toBe('Y');
    expect(pickVoice([{ name: 'X', lang: 'en-AU' }]).name).toBe('X');
    expect(pickVoice([{ name: 'Hans', lang: 'de-DE' }])).toBeNull();
    expect(pickVoice()).toBeNull();
  });
});
