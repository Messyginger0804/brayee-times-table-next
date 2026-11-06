"use client";
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

/** Loads one skill (with the player's level and progress) from the curriculum API. */
export function useSkillLoader(user, skillId) {
  const [skill, setSkill] = useState(undefined); // undefined loading, null not found
  const [levelIndex, setLevelIndex] = useState(0);
  const [prog, setProg] = useState({ have: 0, need: 10 });
  const levelRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    axios.get('/api/curriculum/me', { params: { grade: 'all' }, withCredentials: true })
      .then((r) => {
        const s = (r.data?.skills || []).find((x) => x.id === skillId) || null;
        setSkill(s);
        if (!s) return;
        levelRef.current = s.levelIndex || 0;
        setLevelIndex(s.levelIndex || 0);
        setProg({ have: s.progress?.levelHave ?? 0, need: s.progress?.levelNeed ?? 10 });
      })
      .catch(() => setSkill(null));
  }, [user, skillId]);

  return { skill, levelIndex, setLevelIndex, prog, setProg, levelRef };
}
