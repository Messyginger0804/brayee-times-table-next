// Braylee's spoken cheers. All speech goes through lib/voice.js (voice choice, kid pitch, speed). Everything degrades silently when speech is unavailable (SSR, tests).
// - speakCheer(text): schedules a cheer after a short settle delay (a later cheer replaces a pending one, so a
//   bigger moment right after a smaller one wins). At most one cheer per CHEER_GAP_MS, never overlapping.
// - speakBigCheer(text): result screens and modals. Takes priority over ordinary cheers: replaces a pending one,
//   cuts off one that is playing, and skips the throttle. Ordinary cheers can't replace a pending big one.
// - speakSpelling(text): Spelling Bee speech. Always wins: cancels pending/playing cheers, and no cheer starts
//   while a spelling utterance is playing.
// - isMuted / setMuted / useCheerMuted: mute is persisted in localStorage (default ON = cheers are spoken).
//   Muting stops only cheers, never spelling words.
import { useSyncExternalStore } from 'react';
import { speak, cancelSpeech, isSpeaking, isSpeechAvailable } from './voice';

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
let spellingToken = 0;

const SPELLING_RATE = 0.95; // a touch slower so spelling words stay clear
const CHEER_RATE = 1.05;

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
    if (!spellingBusy) cancelSpeech();
  }
  muteListeners.forEach((l) => l());
}

const subscribeMuted = (l) => { muteListeners.add(l); return () => muteListeners.delete(l); };
/** [muted, setMuted] for a toggle button. Server render reports "not muted". */
export function useCheerMuted() {
  return [useSyncExternalStore(subscribeMuted, isMuted, () => false), setMuted];
}

const stripEmoji = (t) => String(t).replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim();

function fireCheer(text, big = false) {
  pending = null;
  pendingBig = false;
  if (!isSpeechAvailable() || isMuted() || spellingBusy) return;
  const now = Date.now();
  if (!big && (isSpeaking() || now - lastCheerAt < CHEER_GAP_MS)) return;
  const spoken = stripEmoji(text);
  if (!spoken) return;
  lastCheerAt = now;
  if (big && isSpeaking()) cancelSpeech(); // cut off the ordinary cheer (spelling is excluded above)
  speak(spoken, { rateScale: CHEER_RATE });
}

/** Speak a cheer (bubble text; emoji are not read aloud). Safe to call anywhere, anytime. */
export function speakCheer(text) {
  if (!text || !isSpeechAvailable() || isMuted() || pendingBig) return;
  cancelCheer();
  pending = setTimeout(() => fireCheer(text), CHEER_SETTLE_MS);
}

/** Speak a "big moment" line (result screen, level-up, unlock). Beats ordinary cheers; never beats spelling. */
export function speakBigCheer(text) {
  if (!text || !isSpeechAvailable() || isMuted()) return;
  cancelCheer();
  pendingBig = true;
  pending = setTimeout(() => fireCheer(text, true), CHEER_SETTLE_MS);
}

const endSpelling = () => { spellingBusy = false; clearTimeout(spellingGuard); };

/** Spelling Bee speech (words, sentences, Hear buttons). Wins over any cheer. */
export function speakSpelling(text) {
  if (!isSpeechAvailable()) return;
  cancelCheer();
  cancelSpeech();
  spellingBusy = true;
  clearTimeout(spellingGuard);
  spellingGuard = setTimeout(endSpelling, 15000); // never stay "busy" if the browser drops the end event
  const token = ++spellingToken;
  // cancelSpeech() fires the previous utterance's end event later; only the latest utterance may clear the busy flag
  const done = () => { if (token === spellingToken) endSpelling(); };
  speak(text, { rateScale: SPELLING_RATE, spelling: true, onend: done, onerror: done });
}

/** Test helper: back to a clean module state. */
export function resetCheerVoice() {
  cancelCheer();
  clearTimeout(spellingGuard);
  muted = null;
  lastCheerAt = -Infinity;
  spellingBusy = false;
}
