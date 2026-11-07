// Link between the pages and the one shared 3D canvas (components/space/SpaceScene).
// React-visible state (which scene, popup open, canvas ready, planet list) goes through subscribe();
// per-frame inputs (hover, tap, warp, celebration) live in the mutable `fx` object the canvas reads each frame.
import { useEffect, useSyncExternalStore } from 'react';

const WHOOSH_MS = 420;
const CELEBRATE_MS = 2400;

let state = { scene: 'home', popups: 0, ready: false, reduced: false, celebrating: false, version: 0 };
const listeners = new Set();
const planets = new Map(); // mission id -> { el, state, kind }
let celebrateTimer = null;

/** Mutable per-frame inputs. Times are performance.now() stamps. */
export const fx = { hover: null, tap: null, warp: null, warpV: 0, celebrate: null, launch: 0, calm: 1, busyUntil: 0 };

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const sceneFx = {
  get: () => state,
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  set,
  planets,
  /** Mission map registers each planet slot; the canvas draws a 3D planet at its rect. Returns unregister. */
  registerPlanet(id, info) {
    planets.set(id, info);
    set({ version: state.version + 1 });
    return () => { planets.delete(id); set({ version: state.version + 1 }); };
  },
  hover(id) { fx.hover = id; },
  /** Clear the hover only if `id` still owns it (pointer left, was cancelled, or the planet unmounted while hovered). */
  unhover(id) { if (fx.hover === id) fx.hover = null; },
  tap(id) { fx.tap = { id, t: performance.now() }; fx.busyUntil = performance.now() + 900; set({}); },
  /** Zoom the planet and whoosh the stars, then run `go` (immediately when the 3D scene is off or motion is reduced). */
  whoosh(id, go) {
    if (!state.ready || state.reduced) { go(); return; }
    const now = performance.now();
    fx.warp = { id, t: now };
    fx.warpV = 1;
    fx.busyUntil = now + 1500;
    set({});
    setTimeout(go, WHOOSH_MS);
  },
  /** Level-up / mastery party for ~2s. kind: 'levelUp' | 'mastered' */
  celebrate(kind) {
    if (state.reduced) return;
    fx.celebrate = { kind, t: performance.now() };
    fx.busyUntil = performance.now() + CELEBRATE_MS;
    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => set({ celebrating: false }), CELEBRATE_MS);
    set({ celebrating: true });
  },
  /** Anything that needs full frame rate for a moment (burst, boost). */
  busy(ms = 1500) { fx.busyUntil = performance.now() + ms; },
};

export function useSceneState(select) {
  return useSyncExternalStore(sceneFx.subscribe, () => select(state), () => select(state));
}

/** Tell the canvas which set piece to show: 'login' | 'home' | 'game' | 'bee'. */
export function useSceneKind(scene) {
  useEffect(() => { set({ scene }); }, [scene]);
}

/** While `active`, the canvas deepens its nebula glow behind popups and pickers. */
export function useScenePopup(active) {
  useEffect(() => {
    if (!active) return undefined;
    set({ popups: state.popups + 1 });
    return () => set({ popups: Math.max(0, state.popups - 1) });
  }, [active]);
}
