"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * State for the global Ready-set-go overlay. `playIntro()` returns a Promise that resolves when the intro
 * ends or is skipped. One intro at a time: a second call (e.g. React strict-mode double effects) shares the
 * running one.
 */
export function useIntroPlayer() {
  const [introOn, setIntroOn] = useState(false);
  const intro = useRef(null); // { promise, resolve } while showing

  const finishIntro = useCallback(() => {
    const cur = intro.current;
    intro.current = null;
    setIntroOn(false);
    cur?.resolve();
  }, []);

  const playIntro = useCallback(() => {
    if (intro.current) return intro.current.promise;
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    intro.current = { promise, resolve };
    setIntroOn(true);
    return promise;
  }, []);

  // Provider gone mid-intro: release anyone waiting (their own cancel flags keep them from acting)
  useEffect(() => () => intro.current?.resolve(), []);

  return { introOn, finishIntro, playIntro };
}
