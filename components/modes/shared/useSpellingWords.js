"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildWordParams, loadWords } from './spellingLogic';

/** Word list for the picker (grade / tier / unit). The first load adopts the kid's own grade. */
export function useSpellingWords() {
  const [wordsReady, setWordsReady] = useState(false);
  const [myGrade, setMyGrade] = useState(null); // the kid's own grade (null = no grade set: no picker, old behaviour)
  const [pick, setPick] = useState({ grade: null, tier: '', unit: '' });
  const wordsRef = useRef([]);
  const firstLoad = useRef(true);
  const skipNext = useRef(false);

  const onLoaded = useCallback(({ words, grade }) => {
    wordsRef.current = words || [];
    if (firstLoad.current) {
      firstLoad.current = false;
      setMyGrade(grade);
      if (grade) { skipNext.current = true; setPick((p) => ({ ...p, grade })); }
    }
    setWordsReady(true);
  }, []);

  useEffect(() => {
    if (skipNext.current) { skipNext.current = false; return undefined; } // the pick.grade set by the first load itself
    let alive = true;
    setWordsReady(false);
    loadWords(buildWordParams(firstLoad.current, pick.grade, pick.tier, pick.unit))
      .then((loaded) => { if (alive) onLoaded(loaded); });
    return () => { alive = false; };
  }, [pick.grade, pick.tier, pick.unit, onLoaded]);

  return { wordsReady, myGrade, pick, setPick, wordsRef };
}
