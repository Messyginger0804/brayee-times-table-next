// Tiny external store that links gameplay (correct/wrong answers) to the 3D scene.
// The canvas lives in the root layout, the game lives in pages, so they share this.
import { useSyncExternalStore } from 'react';

let state = { correct: 0, burst: 0, wrong: 0 };
let gifMessage = ''; // text of the GIF card on screen, so the astronaut's bubble never repeats it
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// One-shot event emitter (correct / wrong / streak / levelUp / session) for the astronaut and friends.
const handlers = new Set();
function emit(type, payload = {}) {
  handlers.forEach((h) => { try { h({ type, ...payload }); } catch (_) {} });
}

export const gameFx = {
  /** A correct answer: rocket climbs and a star burst pops */
  correct() { set({ correct: state.correct + 1, burst: state.burst + 1 }); emit('correct'); },
  /** A wrong answer: rocket gives a gentle wobble (never harsh) */
  wrong() { set({ wrong: state.wrong + 1 }); emit('wrong'); },
  /** New session: rocket returns to the launch pad */
  reset() { set({ correct: 0 }); emit('session'); },
  /** Emit a custom event, e.g. 'streak' ({ n }) or 'levelUp' */
  emit,
  /** Subscribe to events: fn({ type, ...payload }). Returns an unsubscribe fn. */
  on(fn) { handlers.add(fn); return () => handlers.delete(fn); },
  setGifMessage(m) { gifMessage = m || ''; },
  getGifMessage: () => gifMessage,
  getState: () => state,
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
};

const serverState = { correct: 0, burst: 0, wrong: 0 };

export function useGameFx() {
  return useSyncExternalStore(gameFx.subscribe, gameFx.getState, () => serverState);
}
