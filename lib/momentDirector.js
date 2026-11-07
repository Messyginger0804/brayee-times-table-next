// One big moment at a time. A level-up/mastery modal, a streak or record GIF card, a celebrate/try-again GIF
// card and the astronaut's speech bubble all ask this director for the single "stage" slot. A higher rank
// preempts the holder, an equal rank replaces it, a lower rank is dropped (never queued). Confetti and the
// 3D trophy are background and do not claim the slot.
import { useEffect, useSyncExternalStore } from 'react';

const RANK = { modal: 4, streak: 3, celebrate: 2, bubble: 1 };

export function createDirector() {
  let holder = null; // { kind, id, onPreempt }
  let seq = 0;
  const subs = new Set();
  const notify = () => subs.forEach((l) => l());

  return {
    /**
     * Ask for the slot. Returns a release function when granted, or null when a higher-ranked moment holds it.
     * `onPreempt` runs if this moment is later displaced, so the owner can hide itself.
     */
    claim(kind, onPreempt) {
      const rank = RANK[kind];
      if (!rank) return null;
      if (holder && RANK[holder.kind] > rank) return null;
      const displaced = holder;
      const mine = { kind, id: ++seq, onPreempt };
      holder = mine;
      try { displaced?.onPreempt?.(); } catch (_) {}
      notify();
      return () => {
        if (holder?.id !== mine.id) return;
        holder = null;
        notify();
      };
    },
    current: () => holder?.kind ?? null,
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
