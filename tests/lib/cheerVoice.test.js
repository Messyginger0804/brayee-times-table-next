import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetVoice } from '../../lib/voice';
import { speakCheer, speakBigCheer, speakSpelling, replayCheer, stopCheers, setMuted, isMuted, resetCheerVoice, CHEER_GAP_MS, CHEER_SETTLE_MS, MUTE_KEY } from '../../lib/cheerVoice';

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
  resetVoice();
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

describe('speakBigCheer', () => {
  it('replaces a pending ordinary cheer', () => {
    speakCheer('Correct!'); speakBigCheer('Mission complete!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Mission complete!']);
  });
  it('is not dropped by the throttle right after an ordinary cheer', () => {
    speakCheer('Correct!'); flush(); finish();
    vi.advanceTimersByTime(300);
    speakBigCheer('Mission complete!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Correct!', 'Mission complete!']);
  });
  it('cuts off an ordinary cheer that is still playing', () => {
    speakCheer('Correct!'); flush();
    synth.cancel.mockClear();
    speakBigCheer('Level up!'); flush();
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken.at(-1).text).toBe('Level up!');
  });
  it('an ordinary cheer cannot replace a pending big one', () => {
    speakBigCheer('Level up!'); speakCheer('Correct!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Level up!']);
  });
  it('throttles ordinary cheers right after it', () => {
    speakBigCheer('Level up!'); flush(); finish();
    speakCheer('Next'); flush();
    expect(spoken).toHaveLength(1);
  });
  it('respects mute and ignores empty text', () => {
    speakBigCheer(''); setMuted(true); speakBigCheer('Yay'); flush();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('never beats spelling: cancelled by it, and silent while it plays', () => {
    speakBigCheer('Level up!'); speakSpelling('Spell: cat'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Spell: cat']);
    speakBigCheer('Again'); flush();
    expect(spoken).toHaveLength(1);
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

describe('speakSpelling', () => {
  it('a stale end event from a cancelled utterance does not clear the new one', () => {
    speakSpelling('first');
    const first = spoken[0];
    speakSpelling('second');
    first.onend(); // the browser reports the cancelled one late
    speakCheer('Yay!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['first', 'second']); // still busy: cheer held back
    spoken[1].onend(); finish();
    vi.advanceTimersByTime(CHEER_GAP_MS);
    speakCheer('Yay!'); flush();
    expect(spoken.at(-1).text).toBe('Yay!');
  });
});

describe('pre-generated clips', () => {
  let audios;
  let playResult;
  beforeEach(() => {
    audios = [];
    playResult = () => Promise.resolve();
    vi.stubGlobal('Audio', function FakeAudio(url) {
      this.url = url;
      this.paused = true;
      this.ended = false;
      this.pause = vi.fn(() => { this.paused = true; });
      this.play = vi.fn(() => { this.paused = false; return playResult(); });
      audios.push(this);
    });
  });
  const flushAsync = async () => { await Promise.resolve(); await Promise.resolve(); };

  it('plays the clip instead of speaking when the line has one', () => {
    speakCheer('Great job! 🚀'); flush();
    expect(audios).toHaveLength(1);
    expect(audios[0].url).toBe('/audio/braylee/great-job.mp3');
    expect(audios[0].play).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('speaks lines without a clip, and instructions never use a clip', () => {
    speakCheer('7 in a row!'); flush();
    expect(audios).toHaveLength(0);
    expect(spoken.map((u) => u.text)).toEqual(['7 in a row!']);
    speakSpelling('Great job!');
    expect(audios).toHaveLength(0);
  });
  it('works when speechSynthesis is unavailable but Audio exists', () => {
    vi.stubGlobal('window', {});
    speakCheer('Woohoo!'); flush();
    expect(audios).toHaveLength(1);
  });
  const domErr = (name) => Object.assign(new Error(name), { name });
  it.each(['NotAllowedError', 'AbortError'])('%s from play() speaks this time but does not blacklist the clip', async (name) => {
    playResult = () => Promise.reject(domErr(name));
    speakCheer('Great job!'); flush();
    await flushAsync();
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
    finish();
    vi.advanceTimersByTime(CHEER_GAP_MS);
    playResult = () => Promise.resolve();
    speakCheer('Great job!'); flush();
    expect(audios).toHaveLength(2); // requested the clip again
  });
  it('a decode failure from play() (NotSupportedError) blacklists the clip', async () => {
    playResult = () => Promise.reject(domErr('NotSupportedError'));
    speakCheer('Great job!'); flush();
    await flushAsync();
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
    finish();
    vi.advanceTimersByTime(CHEER_GAP_MS);
    speakCheer('Great job!'); flush();
    expect(audios).toHaveLength(1);
    expect(spoken).toHaveLength(2);
  });
  it('replay leaves a pending big cheer queued', () => {
    speakBigCheer('Mission complete!');
    replayCheer('Great job!');
    flush();
    expect(audios.map((x) => x.url)).toEqual(['/audio/braylee/great-job.mp3', '/audio/braylee/mission-complete.mp3']);
  });
  it('falls back to speech once on a load error (404), then skips the clip for that line', () => {
    speakCheer('Great job!'); flush();
    const onerror = audios[0].onerror;
    onerror(); onerror();
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
    finish();
    vi.advanceTimersByTime(CHEER_GAP_MS);
    speakCheer('Great job!'); flush();
    expect(audios).toHaveLength(1);
    expect(spoken).toHaveLength(2);
  });
  it('does not play or speak while muted, and muting stops a playing clip without a fallback', () => {
    setMuted(true);
    speakCheer('Great job!'); flush();
    expect(audios).toHaveLength(0);
    setMuted(false);
    speakCheer('Great job!'); flush();
    expect(audios).toHaveLength(1);
    setMuted(true);
    expect(audios[0].pause).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('a big cheer stops the previous clip and starts its own', () => {
    speakCheer('Great job!'); flush();
    speakBigCheer('Mission complete! 🚀'); flush();
    expect(audios[0].pause).toHaveBeenCalled();
    expect(audios[1].url).toBe('/audio/braylee/mission-complete.mp3');
  });
  it('does not start an ordinary cheer over a playing clip', () => {
    speakCheer('Great job!'); flush();
    vi.advanceTimersByTime(CHEER_GAP_MS + 100);
    speakCheer('Woohoo!'); flush();
    expect(audios).toHaveLength(1);
  });
  it('spelling speech stops a playing clip and its late error does not speak', () => {
    speakCheer('Great job!'); flush();
    speakSpelling('because');
    expect(audios[0].pause).toHaveBeenCalled();
    expect(audios[0].onerror).toBeNull();
  });
  it('stopCheers stops the clip, pending cheers and speech', () => {
    speakCheer('Great job!'); flush();
    speakCheer('Woohoo!');
    stopCheers();
    expect(audios[0].pause).toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalled();
    flush();
    expect(audios).toHaveLength(1);
  });
  it('a stale failure on replaced audio does not blacklist the clip', () => {
    speakCheer('Great job!'); flush();
    const old = audios[0];
    speakBigCheer('Mission complete!'); flush();
    old.onerror?.();
    expect(spoken).toHaveLength(0);
    stopCheers();
    vi.advanceTimersByTime(CHEER_GAP_MS);
    speakCheer('Great job!'); flush();
    expect(audios.at(-1).url).toBe('/audio/braylee/great-job.mp3');
  });
  it('a clip that never starts falls back to speech once, without blacklisting', () => {
    speakCheer('Great job!'); flush();
    vi.advanceTimersByTime(3001);
    expect(audios[0].pause).toHaveBeenCalled();
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
    vi.advanceTimersByTime(10000);
    expect(spoken).toHaveLength(1);
    finish();
    speakCheer('Great job!'); flush();
    expect(audios).toHaveLength(2);
  });
  it('a clip that starts but never ends is caught after its duration plus a margin', () => {
    speakCheer('Great job!'); flush();
    audios[0].duration = 2;
    audios[0].onplaying();
    vi.advanceTimersByTime(3000);
    expect(spoken).toHaveLength(0);
    vi.advanceTimersByTime(600);
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
  });
  it('the watchdog is cleared when the clip ends and when it is stopped', () => {
    speakCheer('Great job!'); flush();
    audios[0].onplaying(); audios[0].onended();
    vi.advanceTimersByTime(20000);
    expect(spoken).toHaveLength(0);
    vi.advanceTimersByTime(CHEER_GAP_MS);
    speakBigCheer('Mission complete!'); flush();
    stopCheers();
    vi.advanceTimersByTime(20000);
    expect(spoken).toHaveLength(0);
  });
  it('the watchdog does not speak after muting', () => {
    speakCheer('Great job!'); flush();
    setMuted(true);
    vi.advanceTimersByTime(20000);
    expect(spoken).toHaveLength(0);
  });
});

describe('stopCheers and spelling state', () => {
  it('clears the spelling state so later cheers are not blocked', () => {
    speakSpelling('Spell: cat'); finish();
    stopCheers();
    speakCheer('Great!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Spell: cat', 'Great!']);
  });
  it('a late end/error from the stopped utterance does not clear a newer spelling state', () => {
    speakSpelling('Spell: cat');
    const old = spoken[0];
    stopCheers();
    speakSpelling('Spell: hat');
    old.onend(); old.onerror();
    finish();
    speakCheer('Great!'); flush();
    expect(spoken.map((u) => u.text)).toEqual(['Spell: cat', 'Spell: hat']);
  });
});

describe('replayCheer (tap on the bubble)', () => {
  let audios;
  beforeEach(() => {
    audios = [];
    vi.stubGlobal('Audio', function FakeAudio(url) {
      this.url = url; this.paused = true; this.ended = false;
      this.pause = vi.fn(() => { this.paused = true; });
      this.play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
      audios.push(this);
    });
  });
  it('plays her clip immediately, with no settle delay', () => {
    replayCheer('Great job! 🚀');
    expect(audios).toHaveLength(1);
    expect(audios[0].url).toBe('/audio/braylee/great-job.mp3');
  });
  it('restarts a clip that is already playing, even inside the throttle gap', () => {
    speakCheer('Great job!'); flush();
    replayCheer('Great job!');
    expect(audios[0].pause).toHaveBeenCalled();
    expect(audios).toHaveLength(2);
    expect(audios[1].play).toHaveBeenCalled();
  });
  it('cancels a pending cheer so it does not fire after the replay', () => {
    speakCheer('Great job!');
    replayCheer('Great job!');
    flush();
    expect(audios).toHaveLength(1);
  });
  it('does nothing while muted', () => {
    setMuted(true);
    replayCheer('Great job!');
    replayCheer('7 in a row!');
    expect(audios).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('is ignored while spelling speech is playing', () => {
    speakSpelling('cat');
    replayCheer('Great job!');
    replayCheer('7 in a row!');
    expect(audios).toHaveLength(0);
    expect(spoken.map((u) => u.text)).toEqual(['cat']);
  });
  it('speaks lines without a clip, cutting off speech already playing', () => {
    replayCheer('7 in a row!');
    replayCheer('7 in a row!');
    expect(spoken.map((u) => u.text)).toEqual(['7 in a row!', '7 in a row!']);
    expect(synth.cancel).toHaveBeenCalled();
  });
  it('falls back to speech when the clip errors', () => {
    replayCheer('Great job!');
    audios[0].onerror();
    expect(spoken.map((u) => u.text)).toEqual(['Great job!']);
  });
  it('ignores empty text', () => {
    replayCheer('');
    expect(audios).toHaveLength(0);
    expect(synth.speak).not.toHaveBeenCalled();
  });
});
