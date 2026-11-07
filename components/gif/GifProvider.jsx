"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GIFS, GIF_SETTINGS, GIF_MESSAGES } from '../../config/gifs';
import { gameFx } from '../../lib/gameFx';
import { director } from '../../lib/momentDirector';
import GifImage from './GifImage';
import ReadySetGo from '../braylee/ReadySetGo';
import { useIntroPlayer } from '../braylee/useIntroPlayer';

const FeedbackContext = createContext(null);
const SlotContext = createContext(() => {});

// Which director rank each GIF card competes at: a streak or record card outranks the ordinary ones
const GIF_KIND = { levelUp: 'streak', streak: 'streak', celebrate: 'celebrate', tryAgain: 'celebrate', welcome: 'celebrate' };
const PENDING_MODAL_MS = 2000;

// Hold the stage for the modal that is about to open (it re-claims on mount); give it back if it never does
function reserveModal(pending) {
  const hold = director.claim('modal');
  clearTimeout(pending.current);
  pending.current = setTimeout(() => hold?.(), PENDING_MODAL_MS);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function saveDataOn() {
  try { return !!navigator.connection?.saveData; } catch (_) { return false; }
}

function warm(gif) {
  // Warm the HTTP cache with the format <picture> will pick (webp when supported)
  const img = new Image();
  img.decoding = 'async';
  img.src = gif.webp;
}

/**
 * Central place for "what happened -> what do we show". Game screens call correct()/wrong()/etc.
 * and this decides whether a GIF appears (chance, cooldown, milestones), drives the 3D scene via
 * gameFx, and shows a small, non-blocking overlay that auto-dismisses.
 */
export function GifProvider({ children }) {
  const [active, setActive] = useState(null);
  const [slotEl, setSlotEl] = useState(null); // <GifSlot/> in the current screen, if any
  const queue = useRef({});          // category -> next entry (already preloading)
  const recent = useRef({});         // category -> last shown id (avoid repeats)
  const lastShownAt = useRef(0);
  const timer = useRef(null);
  const release = useRef(null);     // gives the director's slot back when the card goes away
  const pendingModal = useRef(null);

  const choose = useCallback((cat) => {
    const list = GIFS[cat] || [];
    if (!list.length) return null;
    const pool = list.length > 1 ? list.filter((g) => g.id !== recent.current[cat]) : list;
    return pick(pool);
  }, []);

  const preload = useCallback((cat) => {
    if (saveDataOn()) return;
    if (!queue.current[cat]) queue.current[cat] = choose(cat);
    if (queue.current[cat]) warm(queue.current[cat]);
  }, [choose]);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    release.current?.();
    release.current = null;
    setActive(null);
  }, []);

  const show = useCallback((cat, { n } = {}) => {
    const gif = queue.current[cat] || choose(cat);
    if (!gif) return;
    // One big moment at a time: a modal (or a higher-ranked card) holding the stage drops this card, no backlog
    const mine = director.claim(GIF_KIND[cat], () => {
      clearTimeout(timer.current);
      release.current = null;
      setActive(null);
    });
    if (!mine) return;
    release.current = mine;
    queue.current[cat] = null;
    recent.current[cat] = gif.id;
    lastShownAt.current = Date.now();
    const message = pick(GIF_MESSAGES[cat]).replace('{n}', String(n ?? ''));
    setActive({ key: Date.now(), cat, gif, message });
    clearTimeout(timer.current);
    timer.current = setTimeout(dismiss, GIF_SETTINGS.dismissMs);
    // get the following one ready in the background
    setTimeout(() => preload(cat), 600);
  }, [choose, preload, dismiss]);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(pendingModal.current); }, []);

  const { introOn, finishIntro, playIntro } = useIntroPlayer();

  // Warm the two most likely GIFs once the page is idle
  useEffect(() => {
    const t = setTimeout(() => { preload('celebrate'); preload('tryAgain'); }, 1500);
    return () => clearTimeout(t);
  }, [preload]);

  const api = useMemo(() => {
    const cooledDown = () => Date.now() - lastShownAt.current >= GIF_SETTINGS.cooldownMs;
    const isMilestone = (n) => {
      const ms = GIF_SETTINGS.streakMilestones;
      const top = ms[ms.length - 1];
      return ms.includes(n) || (n > top && GIF_SETTINGS.streakRepeatEvery > 0 && n % GIF_SETTINGS.streakRepeatEvery === 0);
    };
    return {
      /**
       * Session started (entering a game mode / first menu view).
       * With `intro: true` the Ready-set-go overlay plays first and a Promise is returned that resolves
       * when it finishes or is skipped; the round must not start before then. Otherwise returns undefined.
       */
      startSession({ withGif = true, intro: withIntro = false } = {}) {
        gameFx.reset({ silent: withIntro });
        preload('celebrate');
        if (withIntro) return playIntro();
        if (withGif) show('welcome');
        return undefined;
      },
      /** Play only the Ready-set-go overlay (no reset, no GIF). Resolves when it finishes or is skipped. */
      playIntro,
      /**
       * Correct answer. `streak` is the new streak count; `setComplete` / `newBest` trigger levelUp.
       * Returns which GIF category (if any) was shown.
       */
      correct({ streak = 0, setComplete = false, newBest = false, moment } = {}) {
        gameFx.correct(moment);
        let cat = null;
        if (setComplete || newBest) cat = 'levelUp';
        else if (isMilestone(streak)) cat = 'streak';
        else if (cooledDown() && Math.random() < GIF_SETTINGS.celebrateChance) cat = 'celebrate';
        if (cat) show(cat, { n: streak });
        if (cat === 'streak') gameFx.emit('streak', { n: streak });
        else if (cat === 'levelUp') gameFx.emit('levelUp');
        // Preload the milestone GIF one step ahead
        const next = streak + 1;
        if (isMilestone(next)) preload('streak');
        return cat;
      },
      wrong({ moment } = {}) {
        // Encouragement is always shown on a miss, it matters more than the cooldown.
        // Show first so the astronaut's bubble knows the GIF text and picks a different line.
        show('tryAgain');
        gameFx.wrong(moment);
        return 'tryAgain';
      },
      /**
       * Level up. With `modal: true` the caller is about to open the level-up/mastery modal: reserve the stage now
       * (no GIF card, no astronaut bubble, not even for a frame) and let the modal take it over; the confetti still plays.
       */
      levelUp({ modal = false } = {}) {
        if (modal) { dismiss(); reserveModal(pendingModal); } else show('levelUp');
        gameFx.emit('levelUp');
      },
      preload,
      dismiss,
    };
  }, [preload, show, dismiss, playIntro]);

  return (
    <FeedbackContext.Provider value={api}>
      <SlotContext.Provider value={setSlotEl}>{children}</SlotContext.Provider>
      <GifOverlay active={active} onDismiss={dismiss} slotEl={slotEl} />
      <AnimatePresence>{introOn && <ReadySetGo key="intro" onDone={finishIntro} />}</AnimatePresence>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <GifProvider>');
  return ctx;
}

const ring = {
  celebrate: 'border-neon-lime shadow-glow-lime',
  streak: 'border-neon-amber shadow-glow-amber',
  levelUp: 'border-neon-violet shadow-glow-violet',
  tryAgain: 'border-neon-coral shadow-glow-coral',
  welcome: 'border-neon-cyan shadow-glow-cyan',
};

/**
 * Game screens render <GifSlot/> where there is spare room (between the stats and the question);
 * the overlay card shows inside it. Without a slot (menu, login, short phones) the card floats at
 * the top. Either way only the card itself takes pointer events, so the keypad is never blocked.
 */
export function GifSlot() {
  const setSlot = useContext(SlotContext);
  return (
    <div
      ref={setSlot}
      aria-hidden={false}
      className="relative z-40 flex h-0 w-full justify-center [@media(min-height:820px)]:h-28"
    />
  );
}

function GifOverlay({ active, onDismiss, slotEl }) {
  const card = (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: -20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          className={`pointer-events-auto flex h-[6.5rem] w-[min(22rem,92vw)] min-w-0 overflow-hidden rounded-chunk border-2 bg-space-900/95 ${ring[active.cat]}`}
        >
          <button type="button" onClick={onDismiss} aria-label={`Dismiss: ${active.gif.title}`} className="block h-full w-[5.5rem] shrink-0 sm:w-[8.5rem]">
            <GifImage gif={active.gif} className="block h-full w-full object-cover" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-center px-2 text-left sm:px-3">
            <p role="status" aria-live="polite" className="text-body font-bold leading-tight text-ink">{active.message}</p>
            <a
              href={active.gif.page}
              target="_blank"
              rel="noopener noreferrer"
              className="-mb-2 mt-1 inline-flex min-h-12 items-center text-xs text-ink-dim underline"
            >
              Powered by GIPHY
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (slotEl) {
    // absolute so a zero-height slot (short phones) lets the card float over the content instead of shifting it
    return createPortal(<div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center [@media(min-height:820px)]:max-sm:pl-[6.25rem] [@media(min-width:1100px)_and_(max-height:819px)]:inset-x-auto [@media(min-width:1100px)_and_(max-height:819px)]:left-[calc(50%+12rem)] [@media(min-width:1100px)_and_(max-height:819px)]:top-16">{card}</div>, slotEl);
  }
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-safe pt-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))]">
      {card}
    </div>
  );
}
