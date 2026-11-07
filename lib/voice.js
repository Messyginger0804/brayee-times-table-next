// The one place that talks to the browser's on-device speech engine (Web Speech API). No network, no paid APIs.
// Everything else (cheers, Spelling Bee, the voice settings dialog) goes through speak()/cancelSpeech().
// - Voices load robustly: sync read, the async `voiceschanged` event, a few timed retries, and a re-read on the first
//   user gesture (iOS only exposes voices after one).
// - Default voice by preference: a child voice (Microsoft "Ana"), then friendly female voices, then the system default.
// - Settings (voice, Kid voice, speed) persist in localStorage per device.
import { useSyncExternalStore } from 'react';

export const SETTINGS_KEY = 'braylee-voice-settings';
export const KID_PITCH = 1.35;
export const SPELLING_KID_PITCH = 1.2; // a little lower while spelling so letters (B/D/P/T) stay distinct
export const CHILD_VOICE_PITCH = 1.1; // a voice that is already a child needs only a little lift
export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.3;
export const PREVIEW_TEXT = "Hi Cadet! Let's spell rocket. R-O-C-K-E-T!";
const DEFAULT_SETTINGS = Object.freeze({ voiceURI: '', kid: true, speed: 1 });
const RETRY_MS = [250, 1000, 3000];

const CHILD = /\bana(neural)?\b|child|\bkid\b/i;
// Preference order matters: earlier entries win over later ones.
const FRIENDLY = [/samantha/i, /google us english/i, /jenny/i, /aria/i, /zira/i, /karen/i, /moira/i];

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null);
const keyOf = (v) => v.voiceURI || v.name;

const isEnglish = (v) => /^en([-_]|$)/i.test(v?.lang || '');
const isChildVoice = (v) => !!v && CHILD.test(v.name || '');

/** English voices only (child voice first is decided by pickDefaultVoice, not by order here). */
export function englishVoices(voices = []) {
  return (voices || []).filter(isEnglish);
}

/** Default voice: a child voice, then friendly female voices in preference order, then the system default. */
export function pickDefaultVoice(voices = []) {
  const en = englishVoices(voices);
  const child = en.find((v) => isChildVoice(v) && /^en[-_]US$/i.test(v.lang)) || en.find(isChildVoice);
  if (child) return child;
  for (const re of FRIENDLY) {
    const hit = en.find((v) => re.test(v.name || ''));
    if (hit) return hit;
  }
  return en.find((v) => v.default) || en.find((v) => /^en[-_]US$/i.test(v.lang)) || en[0] || null;
}

/** "Microsoft Ana Online (Natural) - English (United States)" becomes "Ana". Non-US accents get a short tag. */
export function friendlyName(v) {
  let n = String(v?.name || 'Voice')
    .replace(/^(Microsoft|Google)\s+/i, '')
    .replace(/\s+-\s+English.*$/i, '')
    .replace(/\((?:natural|enhanced|premium|compact)\)/gi, '')
    .replace(/\bOnline\b|\bNeural\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Voice';
  const region = (v?.lang || '').split(/[-_]/)[1];
  if (region && !/^us$/i.test(region)) n += ` (${region.toUpperCase()})`;
  return isChildVoice(v) ? `${n} (kid voice)` : n;
}

// ---- voice list (cached, observable) ----
let voices = [];
let voiceSig = '';
let started = false;
const voiceListeners = new Set();
const emitVoices = () => voiceListeners.forEach((l) => l());

function refreshVoices() {
  const s = synth();
  let list = [];
  try { list = englishVoices(s?.getVoices?.() || []); } catch (_) { list = []; }
  const sig = list.map(keyOf).join('|');
  if (sig === voiceSig) return voices;
  voiceSig = sig;
  voices = list;
  emitVoices();
  return voices;
}

function startVoiceLoading() {
  if (started) return;
  const s = synth();
  if (!s) return;
  started = true;
  refreshVoices();
  try { s.addEventListener?.('voiceschanged', refreshVoices); } catch (_) {}
  RETRY_MS.forEach((ms) => setTimeout(refreshVoices, ms));
  // Module singletons: these listeners live for the page's lifetime by design (the unlock ones drop after a gesture).
  // iOS Safari exposes voices only after a user gesture
  const unlock = () => {
    refreshVoices();
    ['pointerdown', 'touchend', 'keydown'].forEach((e) => window.removeEventListener(e, unlock));
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((e) => window.addEventListener?.(e, unlock, { passive: true }));
}

/** Resolves with the English voices as soon as there are some, or with [] after `timeout` ms. */
export function loadVoices(timeout = 3000) {
  startVoiceLoading();
  if (refreshVoices().length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    let t;
    const done = () => { clearTimeout(t); voiceListeners.delete(check); resolve(voices); };
    const check = () => { if (voices.length) done(); };
    voiceListeners.add(check);
    t = setTimeout(done, timeout);
  });
}

const getVoices = () => voices;
const subscribeVoices = (l) => { startVoiceLoading(); voiceListeners.add(l); return () => voiceListeners.delete(l); };
/** English voices for the picker. Empty on the server and while loading or when the device has none. */
export function useVoices() {
  return useSyncExternalStore(subscribeVoices, getVoices, () => []);
}

// ---- settings ----
let settings = null;
const settingListeners = new Set();

function sanitize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const speed = Number(r.speed);
  return {
    voiceURI: typeof r.voiceURI === 'string' ? r.voiceURI : '',
    kid: r.kid !== false,
    speed: Number.isFinite(speed) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed)) : 1,
  };
}

export function getSettings() {
  if (settings === null) {
    try { settings = sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY))); } catch (_) { settings = { ...DEFAULT_SETTINGS }; }
  }
  return settings;
}

export function updateSettings(patch) {
  settings = sanitize({ ...getSettings(), ...patch });
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
  settingListeners.forEach((l) => l());
  return settings;
}

const subscribeSettings = (l) => { settingListeners.add(l); return () => settingListeners.delete(l); };
const SERVER_SETTINGS = { ...DEFAULT_SETTINGS };
/** [settings, updateSettings] for the dialog. */
export function useVoiceSettings() {
  return [useSyncExternalStore(subscribeSettings, getSettings, () => SERVER_SETTINGS), updateSettings];
}

/** The voice to use right now: the saved choice if it still exists, else the preferred default. */
export function resolveVoice(list = refreshVoices(), s = getSettings()) {
  return (s.voiceURI && list.find((v) => keyOf(v) === s.voiceURI)) || pickDefaultVoice(list);
}
export const voiceKey = keyOf;

// ---- speaking ----
export const isSpeechAvailable = () => !!synth();
export function isSpeaking() { return !!synth()?.speaking; }
export function cancelSpeech() { try { synth()?.cancel(); } catch (_) {} }

/**
 * Speak `text` with the saved voice settings. `rateScale` lets callers slow down (spelling) or perk up (cheers).
 * Returns the utterance, or null when speech is unavailable. Callers decide about muting and interrupting.
 */
export function speak(text, { rateScale = 1, spelling = false, onend, onerror } = {}) {
  const s = synth();
  if (!s || !text) return null;
  startVoiceLoading();
  const cfg = getSettings();
  const voice = resolveVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'en-US';
  const kidPitch = spelling ? SPELLING_KID_PITCH : KID_PITCH;
  u.pitch = cfg.kid ? (isChildVoice(voice) ? CHILD_VOICE_PITCH : kidPitch) : 1;
  const rate = cfg.speed * rateScale;
  u.rate = Math.round((spelling ? Math.min(1, rate) : rate) * 100) / 100; // spelling never goes faster than normal
  if (voice) u.voice = voice;
  if (onend) u.onend = onend;
  if (onerror) u.onerror = onerror;
  s.speak(u);
  return u;
}

/** Test helper: back to a clean module state. */
export function resetVoice() {
  voices = [];
  voiceSig = '';
  started = false;
  settings = null;
  voiceListeners.clear();
  settingListeners.clear();
}
