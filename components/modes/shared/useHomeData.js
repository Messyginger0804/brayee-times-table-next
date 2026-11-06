"use client";
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { selectProblems, shuffleArray, idsToMap, normalizeCurriculum } from './homeLogic';

const AUTH = { withCredentials: true };

/** Server state for the home screen: problems, attempt history, progress and the grade's missions. */
export function useHomeData(user, scopedSkill) {
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
    if (!user) return;
    axios.get('/api/attempts/last5', AUTH)
      .then((res) => setAttemptSummaries(res.data?.summaries || {}))
      .catch(() => setAttemptSummaries({}));
  }, [user]);

  const fetchProgressSummary = useCallback(() => {
    if (!user) return;
    axios.get('/api/progress/summary', AUTH)
      .then((res) => setUserProgress(idsToMap(res.data?.problemIds)))
      .catch(() => setUserProgress({}));
  }, [user]);

  const fetchMissions = useCallback(() => {
    axios.get('/api/curriculum/me', AUTH)
      .then((r) => setCurr(normalizeCurriculum(r.data)))
      .catch(() => setCurr({ grade: null, skills: [] }));
  }, []);

  useEffect(() => {
    if (user) {
      fetchProblems();
      fetchAllAttemptSummaries();
      fetchProgressSummary();
    } else {
      setProblemsLoading(true);
      setAttemptSummaries({});
      setUserProgress({});
    }
  }, [user, fetchProblems, fetchAllAttemptSummaries, fetchProgressSummary]);

  useEffect(() => { if (user) fetchMissions(); else setCurr(null); }, [user, fetchMissions]);

  useEffect(() => {
    if (!user) return;
    setFilteredProblems(shuffleArray(selectProblems(problems, user, scopedSkill)));
  }, [user, problems, scopedSkill]);

  return {
    filteredProblems, problemsLoading, attemptSummaries, setAttemptSummaries, userProgress, setUserProgress,
    curr, fetchProblems, fetchAllAttemptSummaries, fetchProgressSummary, fetchMissions,
  };
}
