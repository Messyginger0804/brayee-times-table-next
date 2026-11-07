// One big moment at a time. A level-up/mastery modal, a streak or record GIF card, a celebrate/try-again GIF
// card and the astronaut's speech bubble all ask this director for the single "stage" slot. A higher rank
// preempts the holder, an equal rank replaces it, a lower rank is dropped (never queued). Confetti and the
// 3D trophy are background and do not claim the slot.
import { useEffect, useSyncExternalStore } from 'react';

const RANK = { modal: 4, streak: 3, celebrate: 2, bubble: 1 };

const MAX_HOLD_MS = 15000; // safety net for cards and bubbles only; modals are released by closing/unmounting

export function createDirector({ maxHoldMs = MAX_HOLD_MS, warn = (m) => { if (process.env.NODE_ENV !== 'production') console.warn(m); } } = {}) {
  const holders = new Map(); // token -> { kind, onPreempt, timer }
  let seq = 0;
  const subs = new Set();
  const notify = () => subs.forEach((l) => l());
  const top = () => {
    let best = null;
    holders.forEach((h) => { if (!best || RANK[h.kind] > RANK[best]) best = h.kind; });
    return best;
  };
  const drop = (token) => {
    const h = holders.get(token);
    if (!h) return false;
    clearTimeout(h.timer);
    holders.delete(token);
    return true;
  };

  return {
    /**
     * Ask for the slot. Returns an idempotent release function when granted, or null when a higher-ranked moment
     * holds it. Each claim has its own token, so a release only ever frees what that claim holds. Equal or lower
     * ranked holders are displaced (their `onPreempt` runs); overlapping modals coexist and the stage frees when
     * the last one releases. A card or bubble held longer than `maxHoldMs` is released automatically; modals never are.
     */
    claim(kind, onPreempt) {
      const rank = RANK[kind];
      if (!rank) return null;
      const t = top();
      if (t && RANK[t] > rank) return null;
      const displaced = [];
      holders.forEach((h, token) => { if (kind !== 'modal' && RANK[h.kind] <= rank || kind === 'modal' && RANK[h.kind] < rank) displaced.push([token, h]); });
      displaced.forEach(([token]) => drop(token));
      const token = ++seq;
      const release = () => { if (drop(token)) notify(); };
      // A modal the kid is still reading must never be cut off, so only cards and bubbles get the safety net
      const timer = kind === 'modal' ? null : setTimeout(() => { warn(`momentDirector: '${kind}' held over ${maxHoldMs}ms, releasing`); release(); }, maxHoldMs);
      holders.set(token, { kind, onPreempt, timer });
      displaced.forEach(([, h]) => { try { h.onPreempt?.(); } catch (_) {} });
      notify();
      return release;
    },
    current: top,
    subscribe(l) { subs.add(l); return () => subs.delete(l); },
  };
}

export const director = createDirector();

/** While `active`, hold the slot as `kind` (e.g. a dialog that is open). */
export function useMomentClaim(kind, active) {
  useEffect(() => {
    if (!active) return undefined;
    return director.claim(kind) || undefined;
  }, [kind, active]);
}

/** True while a modal holds the slot (other faces and cards step aside). */
export function useModalHeld() {
  return useSyncExternalStore(director.subscribe, () => director.current() === 'modal', () => false);
}
