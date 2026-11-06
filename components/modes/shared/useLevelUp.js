"use client";
import axios from 'axios';

/** Saves a level-up. `stay: true` keeps the player on the results screen so the celebration can show. */
export function useLevelUp({ user, setUser, setMode, fetchProblems }) {
  const updateLevel = async (level) => {
    const { data } = await axios.post('/api/users/level', { level }, { withCredentials: true });
    setUser((prev) => ({ ...(prev || {}), ...data }));
    return data;
  };

  return async ({ stay = false } = {}) => {
    try {
      if (user?.level === 1) await updateLevel(2);
    } catch (_) {
    } finally {
      if (!stay) {
        setMode(null);
        fetchProblems();
      }
    }
  };
}
