import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  pickDefaultVoice, englishVoices, friendlyName, loadVoices, speak, getSettings, updateSettings, resolveVoice,
  resetVoice, SETTINGS_KEY, KID_PITCH, SPELLING_KID_PITCH, CHILD_VOICE_PITCH, SPEED_MAX,
} from '../../lib/voice';

const v = (name, lang = 'en-US', extra = {}) => ({ name, lang, voiceURI: name, ...extra });
let synth;
let store;
let listeners;
beforeEach(() => {
  store = {};
  listeners = {};
  vi.stubGlobal('localStorage', { getItem: (k) => store[k] ?? null, setItem: (k, x) => { store[k] = x; } });
  synth = {
    voices: [],
    getVoices() { return this.voices; },
    addEventListener: (e, f) => { listeners[e] = f; },
    speak: vi.fn(), cancel: vi.fn(), speaking: false,
  };
  vi.stubGlobal('window', { speechSynthesis: synth, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', function Utt(t) { this.text = t; });
  resetVoice();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('pickDefaultVoice preference order', () => {
  it('filters to English voices', () => {
    expect(englishVoices([v('Hans', 'de-DE'), v('Sam', 'en_GB'), v('Fr', 'fr-FR')]).map((x) => x.name)).toEqual(['Sam']);
    expect(pickDefaultVoice([v('Hans', 'de-DE')])).toBeNull();
    expect(pickDefaultVoice()).toBeNull();
  });
  it('a child voice beats every friendly voice', () => {
    const list = [v('Samantha'), v('Microsoft Jenny Online (Natural) - English (United States)'), v('Microsoft Ana Online (Natural) - English (United States)')];
    expect(pickDefaultVoice(list).name).toMatch(/Ana/);
  });
  it('friendly voices are chosen in list order, not device order', () => {
    expect(pickDefaultVoice([v('Moira', 'en-IE'), v('Karen', 'en-AU'), v('Google US English')]).name).toBe('Google US English');
    expect(pickDefaultVoice([v('Moira', 'en-IE'), v('Samantha')]).name).toBe('Samantha');
    expect(pickDefaultVoice([v('Microsoft Zira'), v('Microsoft Aria Online')]).name).toBe('Microsoft Aria Online');
  });
  it('falls back to the system default, then en-US, then any English', () => {
    expect(pickDefaultVoice([v('A', 'en-GB'), v('B', 'en-AU', { default: true })]).name).toBe('B');
    expect(pickDefaultVoice([v('A', 'en-GB'), v('B', 'en-US')]).name).toBe('B');
    expect(pickDefaultVoice([v('A', 'en-AU')]).name).toBe('A');
  });
  it('does not mistake names containing "ana" for the child voice', () => {
    expect(pickDefaultVoice([v('Diana'), v('Samantha')]).name).toBe('Samantha');
  });
});

describe('friendlyName', () => {
  it('cleans vendor noise and tags kid voices and accents', () => {
    expect(friendlyName(v('Microsoft Jenny Online (Natural) - English (United States)'))).toBe('Jenny');
    expect(friendlyName(v('Microsoft Ana Online (Natural) - English (United States)'))).toBe('Ana (kid voice)');
    expect(friendlyName(v('Google UK English Female', 'en-GB'))).toBe('UK English Female (GB)');
  });
});

describe('loadVoices', () => {
  it('resolves when voiceschanged delivers voices', async () => {
    const p = loadVoices();
    synth.voices = [v('Samantha')];
    listeners.voiceschanged();
    expect((await p).map((x) => x.name)).toEqual(['Samantha']);
  });
  it('resolves with voices already present', async () => {
    synth.voices = [v('Samantha'), v('Hans', 'de-DE')];
    expect(await loadVoices()).toHaveLength(1);
  });
  it('gives up with [] after the timeout when the device has no voices', async () => {
    vi.useFakeTimers();
    const p = loadVoices(500);
    vi.advanceTimersByTime(501);
    expect(await p).toEqual([]);
  });
  it('picks up voices that appear on a timed retry (no event fired)', () => {
    vi.useFakeTimers();
    loadVoices(10);
    synth.voices = [v('Samantha')];
    vi.advanceTimersByTime(300);
    expect(resolveVoice().name).toBe('Samantha');
  });
  it('re-reads voices on the first user gesture (iOS)', () => {
    loadVoices(10);
    synth.voices = [v('Samantha')];
    const call = window.addEventListener.mock.calls.find((c) => c[0] === 'pointerdown');
    call[1]();
    expect(resolveVoice().name).toBe('Samantha');
  });
});

describe('settings', () => {
  it('default to Kid voice ON, speed 1', () => {
    expect(getSettings()).toEqual({ voiceURI: '', kid: true, speed: 1 });
  });
  it('persist to localStorage and reload', () => {
    updateSettings({ voiceURI: 'Karen', kid: false, speed: 0.8 });
    expect(JSON.parse(store[SETTINGS_KEY])).toEqual({ voiceURI: 'Karen', kid: false, speed: 0.8 });
    resetVoice();
    expect(getSettings()).toEqual({ voiceURI: 'Karen', kid: false, speed: 0.8 });
  });
  it('clamp and sanitize bad stored data', () => {
    store[SETTINGS_KEY] = JSON.stringify({ speed: 99, kid: 'x', voiceURI: 5 });
    expect(getSettings()).toEqual({ voiceURI: '', kid: true, speed: SPEED_MAX });
    resetVoice();
    store[SETTINGS_KEY] = '{not json';
    expect(getSettings().kid).toBe(true);
  });
  it('a saved voice that has gone away falls back to the default pick', () => {
    synth.voices = [v('Samantha')];
    updateSettings({ voiceURI: 'Gone' });
    expect(resolveVoice(englishVoices(synth.voices)).name).toBe('Samantha');
  });
});

describe('speak', () => {
  it('uses the kid pitch, the chosen voice and the speed', () => {
    synth.voices = [v('Samantha'), v('Karen', 'en-AU')];
    updateSettings({ voiceURI: 'Karen', speed: 0.9 });
    const u = speak('Hello');
    expect(u.voice.name).toBe('Karen');
    expect(u.pitch).toBe(KID_PITCH);
    expect(u.rate).toBe(0.9);
    expect(synth.speak).toHaveBeenCalledWith(u);
  });
  it('uses a gentle pitch for a voice that is already a child, and 1 when Kid voice is off', () => {
    synth.voices = [v('Microsoft Ana Online (Natural) - English (United States)')];
    expect(speak('Hi').pitch).toBe(CHILD_VOICE_PITCH);
    updateSettings({ kid: false });
    expect(speak('Hi').pitch).toBe(1);
  });
  it('spelling caps the rate at 1.0 and lowers the kid pitch; cheers keep the full settings', () => {
    synth.voices = [v('Samantha')];
    updateSettings({ speed: 1.3 });
    const s = speak('B D P T', { rateScale: 0.95, spelling: true });
    expect(s.rate).toBe(1);
    expect(s.pitch).toBe(SPELLING_KID_PITCH);
    const c = speak('Yay!', { rateScale: 1.05 });
    expect(c.rate).toBe(1.37);
    expect(c.pitch).toBe(KID_PITCH);
    updateSettings({ speed: 0.8 });
    expect(speak('word', { rateScale: 0.95, spelling: true }).rate).toBe(0.76);
  });
  it('still speaks with the system voice when there are no voices, and is a no-op without speech', () => {
    expect(speak('Hi').voice).toBeUndefined();
    vi.stubGlobal('window', {});
    expect(speak('Hi')).toBeNull();
  });
});

describe('all speech routes through lib/voice.js', () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|tsx?)$/.test(f) ? [p] : [];
  });
  it('no other source file touches speechSynthesis or SpeechSynthesisUtterance', () => {
    const offenders = readdirSync(process.cwd())
      .filter((d) => !/^(node_modules|tests|coverage|\.[^/]*)$/.test(d) && statSync(join(process.cwd(), d)).isDirectory())
      .flatMap((d) => walk(join(process.cwd(), d)))
      .filter((f) => !f.endsWith(join('lib', 'voice.js')))
      .filter((f) => /speechSynthesis|SpeechSynthesisUtterance/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
