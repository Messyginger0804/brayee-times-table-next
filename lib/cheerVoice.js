// Braylee's spoken cheers. A line with a pre-generated clip (config/brayleeClips.mjs, her cloned voice) plays that mp3
// via HTMLAudioElement; every other line, or a clip that is missing / fails to load or play, is spoken through
// lib/voice.js (voice choice, kid pitch, speed). Everything degrades silently when audio/speech is unavailable (SSR, tests).
// - speakCheer(text): schedules a cheer after a short settle delay (a later cheer replaces a pending one, so a
//   bigger moment right after a smaller one wins). At most one cheer per CHEER_GAP_MS, never overlapping.
// - speakBigCheer(text): result screens and modals. Takes priority over ordinary cheers: replaces a pending one,
//   cuts off one that is playing, and skips the throttle. Ordinary cheers can't replace a pending big one.
// - replayCheer(text): the player tapped the bubble. Plays now (no settle delay, no throttle), restarting her clip if it
//   is already playing (a queued big cheer is left alone); does nothing while muted or while spelling speech is playing.
// - speakSpelling(text): Spelling Bee speech. Always wins: cancels pending/playing cheers, and no cheer starts
//   while a spelling utterance is playing.
// - stopCheers(): stop everything now (pending, clip, speech), e.g. when a screen is skipped or unmounts.
// - isMuted / setMuted / useCheerMuted: mute is persisted in localStorage (default ON = cheers are spoken).
//   Muting stops only cheers, never spelling words.
import { useSyncExternalStore } from 'react';
import { speak, cancelSpeech, isSpeaking, isSpeechAvailable } from './voice';
import { findClip } from '../config/brayleeClips.mjs';

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
let clipAudio = null; // the clip element currently playing (or about to), at most one
let clipWatchdog = null; // timer that catches a clip that never starts or never ends
const badClips = new Set(); // clip ids that failed this session: skip straight to speech instead of re-requesting a 404

const CLIP_START_MS = 3000; // no 'playing' event by then: the clip is stalled (slow network, blocked)
const CLIP_END_MARGIN_MS = 1500; // slack on top of the clip's own duration before an unfinished clip counts as stalled
const CLIP_UNKNOWN_END_MS = 4000; // clips are 1.4-3.3 s; used when the duration is not known

const SPELLING_RATE = 0.95; // a touch slower so spelling words stay clear
const CHEER_RATE = 1.05;

const audioOk = () => typeof window !== 'undefined' && typeof Audio !== 'undefined';
const clipPlaying = () => !!clipAudio && !clipAudio.ended && !clipAudio.paused;
const canSpeak = () => isSpeechAvailable() || audioOk();

/** Stop the playing clip (if any) without triggering the speech fallback. */
function stopClip() {
  const a = clipAudio;
  clipAudio = null;
  clearTimeout(clipWatchdog);
  clipWatchdog = null;
  if (!a) return;
  a.onended = null;
  a.onerror = null;
  a.onplaying = null;
  try { a.pause(); } catch (_) {}
}

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
    stopClip();
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

// Play her recorded clip; on any failure (404, decode error, play() rejected) fall back to the browser voice once.
function playClip(clip, spoken) {
  const a = new Audio(clip.url);
  a.preload = 'auto';
  clipAudio = a;
  let failed = false;
  const speakInstead = () => {
    if (isSpeechAvailable() && !isMuted() && !spellingBusy) speak(spoken, { rateScale: CHEER_RATE });
  };
  const fail = () => {
    if (failed || clipAudio !== a) return; // stopped or replaced meanwhile: stay quiet, don't blacklist
    failed = true;
    badClips.add(clip.id);
    stopClip();
    speakInstead();
  };
  // A stall is usually transient (network), so fall back to speech this time but do not blacklist the clip.
  const arm = (ms) => {
    clearTimeout(clipWatchdog);
    clipWatchdog = setTimeout(() => {
      if (failed || clipAudio !== a) return;
      failed = true;
      stopClip();
      speakInstead();
    }, ms);
  };
  a.onplaying = () => {
    if (clipAudio !== a) return;
    arm((Number.isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : CLIP_UNKNOWN_END_MS) + CLIP_END_MARGIN_MS);
  };
  a.onended = () => { if (clipAudio === a) stopClip(); };
  a.onerror = fail;
  arm(CLIP_START_MS);
  // Autoplay blocked (NotAllowedError) or play interrupted (AbortError) says nothing about the clip itself: speak this
  // time, keep the clip eligible. Real load/decode failures (error event, NotSupportedError, ...) blacklist it.
  const softFail = () => {
    if (failed || clipAudio !== a) return;
    failed = true;
    stopClip();
    speakInstead();
  };
  const onPlayError = (err) => (err?.name === 'NotAllowedError' || err?.name === 'AbortError' ? softFail() : fail());
  try { a.play()?.catch?.(onPlayError); } catch (err) { onPlayError(err); }
}

function fireCheer(text, big = false, keepPending = false) {
  if (!keepPending) { pending = null; pendingBig = false; }
  const spoken = stripEmoji(text);
  if (!spoken) return;
  const found = findClip(spoken);
  const clip = found && audioOk() && !badClips.has(found.id) ? found : null;
  if ((!isSpeechAvailable() && !clip) || isMuted() || spellingBusy) return;
  const now = Date.now();
  if (!big && (isSpeaking() || clipPlaying() || now - lastCheerAt < CHEER_GAP_MS)) return;
  lastCheerAt = now;
  if (big) { stopClip(); if (isSpeaking()) cancelSpeech(); } // cut off the ordinary cheer (spelling is excluded above)
  if (clip) playClip(clip, spoken); else speak(spoken, { rateScale: CHEER_RATE });
}

/** Speak a cheer (bubble text; emoji are not read aloud). Safe to call anywhere, anytime. */
export function speakCheer(text) {
  if (!text || !canSpeak() || isMuted() || pendingBig) return;
  cancelCheer();
  pending = setTimeout(() => fireCheer(text), CHEER_SETTLE_MS);
}

/** Speak a "big moment" line (result screen, level-up, unlock). Beats ordinary cheers; never beats spelling. */
export function speakBigCheer(text) {
  if (!text || !canSpeak() || isMuted()) return;
  cancelCheer();
  pendingBig = true;
  pending = setTimeout(() => fireCheer(text, true), CHEER_SETTLE_MS);
}

/** Replay a bubble line on tap: immediately, restarting any cheer already playing. Ignored when muted or while spelling speech is busy. */
export function replayCheer(text) {
  if (!text || !canSpeak() || isMuted() || spellingBusy) return;
  const keepPending = pendingBig; // a queued result-screen line is a different cheer: leave it be
  if (!keepPending) cancelCheer();
  fireCheer(text, true, keepPending);
}

const endSpelling = () => { spellingBusy = false; clearTimeout(spellingGuard); };

/** Spelling Bee speech (words, sentences, Hear buttons). Wins over any cheer. */
export function speakSpelling(text) {
  if (!isSpeechAvailable()) return;
  cancelCheer();
  stopClip();
  cancelSpeech();
  spellingBusy = true;
  clearTimeout(spellingGuard);
  spellingGuard = setTimeout(endSpelling, 15000); // never stay "busy" if the browser drops the end event
  const token = ++spellingToken;
  // cancelSpeech() fires the previous utterance's end event later; only the latest utterance may clear the busy flag
  const done = () => { if (token === spellingToken) endSpelling(); };
  speak(text, { rateScale: SPELLING_RATE, spelling: true, onend: done, onerror: done });
}

/** Stop every cheer now: pending, clip and speech (including spelling speech). For skipped / unmounting screens. */
export function stopCheers() {
  cancelCheer();
  stopClip();
  cancelSpeech();
  spellingToken++; // late events from the cancelled utterance must not touch newer state
  endSpelling();
}

/** Test helper: back to a clean module state. */
export function resetCheerVoice() {
  cancelCheer();
  stopClip();
  badClips.clear();
  clearTimeout(spellingGuard);
  spellingToken++;
  muted = null;
  lastCheerAt = -Infinity;
  spellingBusy = false;
}
