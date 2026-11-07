"use client";
import { useRef } from 'react';
import axios from 'axios';

/**
 * Saves a level-up. Returns [handleLevelUp, applyPendingLevel].
 * `handleLevelUp({ stay: true })` keeps the player on the results screen so the celebration can show: the saved
 * level is held back until `applyPendingLevel()` (called when she leaves the screen), because changing the user
 * mid-celebration would reload the problems and remount the test. It resolves true on success, false if the save failed.
 */
export function useLevelUp({ user, setUser, setMode, fetchProblems }) {
  const pending = useRef(null);
  const merge = (data) => setUser((prev) => ({ ...(prev || {}), ...data }));

  const updateLevel = async (level) => {
    try {
      const { data } = await axios.post('/api/users/level', { level }, { withCredentials: true });
      return data || {};
    } catch (_) { return null; }
  };

  const applyPendingLevel = () => {
    const data = pending.current;
    pending.current = null;
    if (data) merge(data);
  };

  const handleLevelUp = async ({ stay = false } = {}) => {
    let ok = true;
    // A level already saved but held back: just apply it rather than dropping or re-saving it.
    if (pending.current) { if (!stay) applyPendingLevel(); }
    else if (user?.level === 1) {
      const data = await updateLevel(2);
      ok = !!data;
      if (data) { if (stay) pending.current = data; else merge(data); }
    }
    if (!stay) {
      setMode(null);
      fetchProblems();
    }
    return ok;
  };

  return [handleLevelUp, applyPendingLevel];
}
