// Braylee's spoken cheers (speechSynthesis). Everything degrades silently when speech is unavailable (SSR, tests).
// - speakCheer(text): schedules a cheer after a short settle delay (a later cheer replaces a pending one, so a
//   bigger moment right after a smaller one wins). At most one cheer per CHEER_GAP_MS, never overlapping.
// - speakBigCheer(text): result screens and modals. Takes priority over ordinary cheers: replaces a pending one,
//   cuts off one that is playing, and skips the throttle. Ordinary cheers can't replace a pending big one.
// - speakSpelling(text): Spelling Bee speech. Always wins: cancels pending/playing cheers, and no cheer starts
//   while a spelling utterance is playing.
// - isMuted / setMuted / useCheerMuted: mute is persisted in localStorage (default ON = cheers are spoken).
//   Muting stops only cheers, never spelling words.
import { useSyncExternalStore } from 'react';

export const CHEER_GAP_MS = 2500;
export const CHEER_SETTLE_MS = 80;
export const MUTE_KEY = 'braylee-voice-muted';

let muted = null; // lazily read from localStorage
const muteListeners = new Set();
let pending = null;
let pendingBig = false;
let lastCheerAt = -Infinity;
let spellingBusy = false;
let spellingGuard = null;

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null);

export function isMuted() {
  if (muted === null) {
    try { muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { muted = false; }
  }
  return muted;
}

function cancelCheer() {
  clearTimeout(pending);
  pending = null;
  pendingBig = false;
}

export function setMuted(next) {
  muted = !!next;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (_) {}
  if (muted) {
    cancelCheer();
    // Stop a cheer already playing, but never a spelling word
    if (!spellingBusy) { try { synth()?.cancel(); } catch (_) {} }
  }
  muteListeners.forEach((l) => l());
}

const subscribeMuted = (l) => { muteListeners.add(l); return () => muteListeners.delete(l); };
/** [muted, setMuted] for a toggle button. Server render reports "not muted". */
export function useCheerMuted() {
  return [useSyncExternalStore(subscribeMuted, isMuted, () => false), setMuted];
}

const BRIGHT = /samantha|zira|aria|jenny|karen|moira|tessa|google us english|female|ava|allison|susan/i;
/** A bright English voice if one exists: prefers known cheerful names, then en-US, then any English. */
export function pickVoice(voices = []) {
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang || ''));
  return en.find((v) => BRIGHT.test(v.name || '')) || en.find((v) => /^en[-_]US$/i.test(v.lang)) || en[0] || null;
}

const stripEmoji = (t) => String(t).replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim();

function fireCheer(text, big = false) {
  pending = null;
  pendingBig = false;
  const s = synth();
  if (!s || isMuted() || spellingBusy) return;
  const now = Date.now();
  if (!big && (s.speaking || now - lastCheerAt < CHEER_GAP_MS)) return;
  const spoken = stripEmoji(text);
  if (!spoken) return;
  lastCheerAt = now;
  if (big && s.speaking) { try { s.cancel(); } catch (_) {} } // cut off the ordinary cheer (spelling is excluded above)
  const u = new SpeechSynthesisUtterance(spoken);
  u.lang = 'en-US';
  u.pitch = 1.3;
  u.rate = 1.05;
  const voice = pickVoice(s.getVoices?.());
  if (voice) u.voice = voice;
  s.speak(u);
}

/** Speak a cheer (bubble text; emoji are not read aloud). Safe to call anywhere, anytime. */
export function speakCheer(text) {
  if (!text || !synth() || isMuted() || pendingBig) return;
  cancelCheer();
  pending = setTimeout(() => fireCheer(text), CHEER_SETTLE_MS);
}

/** Speak a "big moment" line (result screen, level-up, unlock). Beats ordinary cheers; never beats spelling. */
export function speakBigCheer(text) {
  if (!text || !synth() || isMuted()) return;
  cancelCheer();
  pendingBig = true;
  pending = setTimeout(() => fireCheer(text, true), CHEER_SETTLE_MS);
}

const endSpelling = () => { spellingBusy = false; clearTimeout(spellingGuard); };

/** Spelling Bee speech (words, sentences, Hear buttons). Wins over any cheer. */
export function speakSpelling(text) {
  const s = synth();
  if (!s) return;
  cancelCheer();
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.onend = endSpelling;
  u.onerror = endSpelling;
  spellingBusy = true;
  clearTimeout(spellingGuard);
  spellingGuard = setTimeout(endSpelling, 15000); // never stay "busy" if the browser drops the end event
  s.speak(u);
}

/** Test helper: back to a clean module state. */
export function resetCheerVoice() {
  cancelCheer();
  clearTimeout(spellingGuard);
  muted = null;
  lastCheerAt = -Infinity;
  spellingBusy = false;
}
