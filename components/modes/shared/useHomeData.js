"use client";
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { selectProblems, shuffleArray, idsToMap, normalizeCurriculum } from './homeLogic';

const AUTH = { withCredentials: true };

/** Server state for the home screen: problems, attempt history, progress and the grade's missions. */
export function useHomeData(user, scopedSkill) {
  const userId = user?.id ?? (user ? 'user' : null); // primitive: a new user object with the same id must not refetch
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [attemptSummaries, setAttemptSummaries] = useState({});
  const [userProgress, setUserProgress] = useState({});
  const [curr, setCurr] = useState(null); // { grade, skills } from /api/curriculum/me (null until loaded)

  const fetchProblems = useCallback(() => {
    setProblemsLoading(true);
    axios.get('/api/problems')
      .then((res) => setProblems(res.data))
      .catch(() => {})
      .finally(() => setProblemsLoading(false));
  }, []);

  const fetchAllAttemptSummaries = useCallback(() => {
    if (!userId) return;
    axios.get('/api/attempts/last5', AUTH)
      .then((res) => setAttemptSummaries(res.data?.summaries || {}))
      .catch(() => setAttemptSummaries({}));
  }, [userId]);

  const fetchProgressSummary = useCallback(() => {
    if (!userId) return;
    axios.get('/api/progress/summary', AUTH)
      .then((res) => setUserProgress(idsToMap(res.data?.problemIds)))
      .catch(() => setUserProgress({}));
  }, [userId]);

  const fetchMissions = useCallback(() => {
    axios.get('/api/curriculum/me', AUTH)
      .then((r) => setCurr(normalizeCurriculum(r.data)))
      // A failed request is not "no grade set": keep what we had and flag the error so the page can offer a retry.
      .catch(() => setCurr((prev) => (prev ? { ...prev, error: true } : { grade: null, skills: [], error: true })));
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProblems();
      fetchAllAttemptSummaries();
      fetchProgressSummary();
    } else {
      setProblemsLoading(true);
      setAttemptSummaries({});
      setUserProgress({});
    }
  }, [userId, fetchProblems, fetchAllAttemptSummaries, fetchProgressSummary]);

  useEffect(() => { if (userId) fetchMissions(); else setCurr(null); }, [userId, fetchMissions]);

  useEffect(() => {
    if (!user) return;
    setFilteredProblems(shuffleArray(selectProblems(problems, user, scopedSkill)));
  }, [user, problems, scopedSkill]);

  return {
    filteredProblems, problemsLoading, attemptSummaries, setAttemptSummaries, userProgress, setUserProgress,
    curr, fetchProblems, fetchAllAttemptSummaries, fetchProgressSummary, fetchMissions,
  };
}
