"use client";
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import axios from 'axios';

import { useSession, signOut } from 'next-auth/react';
import MemorizeMode from '../components/MemorizeMode';
import PracticeMode from '../components/PracticeMode';
import TestingMode from '../components/TestingMode';
import LevelIndicator from '../components/LevelIndicator';
import Header from '../components/Header';

function AppInner() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const loading = status === 'loading';
  const [mode, setMode] = useState(null);
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [attemptSummaries, setAttemptSummaries] = useState({});
  const [userProgress, setUserProgress] = useState({});

  // Load user details (level, image) when authenticated via NextAuth
  useEffect(() => {
    if (status === 'authenticated') {
      axios.get('/api/auth/me', { withCredentials: true })
        .then((r) => setUser(r.data || null))
        .catch(() => setUser(null));
    } else if (status === 'unauthenticated') {
      setUser(null);
    }
  }, [status]);

  const shuffleArray = (array) => {
    const newArray = [...array];
    let currentIndex = newArray.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
  };

  const fetchProblems = () => {
    setProblemsLoading(true);
    axios.get('/api/problems')
      .then(res => setProblems(res.data))
      .catch(() => {})
      .finally(() => setProblemsLoading(false));
  };

  const fetchAllAttemptSummaries = () => {
    if (!user) return;
    axios.get('/api/attempts/last5', { withCredentials: true })
      .then(res => setAttemptSummaries(res.data?.summaries || {}))
      .catch(() => setAttemptSummaries({}));
  };

  const fetchProgressSummary = () => {
    if (!user) return;
    axios.get('/api/progress/summary', { withCredentials: true })
      .then(res => {
        const ids = res.data?.problemIds || [];
        const map = {}; ids.forEach(id => map[id] = true);
        setUserProgress(map);
      })
      .catch(() => setUserProgress({}));
  };

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
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let currentLevelProblems = [];
    if (user.level === 1) {
      currentLevelProblems = problems.filter(p => {
        const [a, b] = p.problem.split(' x ').map(Number);
        return a <= 5 && b <= 5;
      });
    } else {
      currentLevelProblems = problems;
    }
    setFilteredProblems(shuffleArray(currentLevelProblems));
  }, [user, problems]);

  const updateLevel = async (level) => {
    const { data } = await axios.post('/api/users/level', { level }, { withCredentials: true });
    setUser(prev => ({ ...(prev || {}), ...data }));
    return data;
  };

  const handleLevelUp = async () => {
    try {
      if (user?.level === 1) await updateLevel(2);
    } catch (_) {
    } finally {
      setMode(null);
      fetchProblems();
    }
  };

  const resetGame = () => {
    setMode(null);
    if (user) {
      fetchProblems();
      fetchAllAttemptSummaries();
      fetchProgressSummary();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-gochi-hand text-white">Loading... 💖</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex flex-col items-center justify-center p-4">
        <div className="p-6 bg-white bg-opacity-50 rounded-lg shadow-lg flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-gochi-hand text-pink-500">Who’s playing? 💖</h1>
          <p className="text-purple-700">Please sign in to start practicing.</p>
          <a href="/login" className="px-6 py-3 rounded-lg bg-purple-500 text-white font-gochi-hand text-2xl hover:bg-purple-600">Go to Login</a>
        </div>
      </div>
    );
  }

  if (problemsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-gochi-hand text-white">Loading Problems... 💖</h1>
      </div>
    );
  }

  if (!mode) {
    const totalCount = filteredProblems.length;
    const completedCount = filteredProblems.filter(p => userProgress[p.id]).length;
    const canUseTesting = totalCount > 0 && completedCount === totalCount;
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 relative">
        <Header onReset={resetGame} userName={user.name} userImage={user.image} />
        <div className="flex flex-col items-center justify-center text-center p-4">
          <LevelIndicator level={user.level} />
          <h1 className="text-4xl md:text-6xl font-gochi-hand text-pink-500 mb-8">Choose Your Mode ✨</h1>
          <div className="flex flex-col md:flex-row items-center md:items-start">
            <button onClick={() => setMode('memorize')} className="px-8 py-4 text-2xl rounded-lg cursor-pointer bg-pink-400 text-white border-none hover:bg-pink-500 mb-4 md:mb-0 md:mr-4">Memorize Mode 🧠💖</button>
            <button onClick={() => setMode('practice')} className="px-8 py-4 text-2xl rounded-lg cursor-pointer bg-teal-400 text-white border-none hover:bg-teal-500 mb-4 md:mb-0 md:mr-4">Practice Mode ✏️✨</button>
            <div className="flex flex-col items-center">
              <button onClick={() => {
                if (canUseTesting) setMode('testing');
                else Swal.fire({ icon: 'info', title: 'Keep Practicing ✨', text: 'Answer every problem in this level at least once in Practice Mode to unlock Testing Mode.', confirmButtonColor: '#a855f7' });
              }} className={`px-8 py-4 text-2xl rounded-lg border-none mb-1 ${canUseTesting ? 'cursor-pointer bg-purple-400 text-white hover:bg-purple-500' : 'cursor-not-allowed bg-purple-300 text-white/70'}`}>
                Testing Mode 🧪🌟
              </button>
              <div className="text-sm mt-1 text-purple-900/80 text-center">
                {canUseTesting ? `All ${totalCount} completed — Testing unlocked!` : `Completed ${completedCount} / ${totalCount} to unlock Testing`}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            try { await axios.post('/api/auth/logout', {}, { withCredentials: true }); } catch (_) {}
            try {
              await Swal.fire({
                icon: 'info',
                title: 'See you soon! ✨',
                showConfirmButton: false,
                timer: 1600,
                confirmButtonColor: '#a855f7',
                background: 'transparent',
              });
            } catch (_) {}
            await signOut({ callbackUrl: '/login' });
          }}
          className="absolute bottom-4 left-4 px-6 py-2 text-lg rounded-lg cursor-pointer bg-red-500 text-white border-none hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    );
  }

  if (mode === 'memorize') {
    return <MemorizeMode problems={filteredProblems} level={user.level} onReset={resetGame} />;
  }
  if (mode === 'practice') {
    return (
      <PracticeMode problems={filteredProblems} level={user.level} onReset={resetGame}
        attemptSummaries={attemptSummaries} setAttemptSummaries={setAttemptSummaries}
        userProgress={userProgress} setUserProgress={setUserProgress} />
    );
  }
  if (mode === 'testing') {
    return (
      <TestingMode problems={filteredProblems} level={user.level} onLevelUp={handleLevelUp} onReset={resetGame}
        attemptSummaries={attemptSummaries} setAttemptSummaries={setAttemptSummaries} userProgress={userProgress} />
    );
  }
  return null;
}

export default function Page() {
  return <AppInner />;
}
