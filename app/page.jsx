"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import { useSession, signOut } from 'next-auth/react';
import MemorizeMode from '../components/MemorizeMode';
import PracticeMode from '../components/PracticeMode';
import TestingMode from '../components/TestingMode';
import LevelIndicator from '../components/LevelIndicator';
import MissionMap from '../components/MissionMap';
import { PROBLEM_SKILLS, parseProblemText } from '../lib/problemSkills';
import Header from '../components/Header';
import AstronautStage from '../components/game/AstronautStage';
import HostAstronaut, { SpeechBubble, HOST_WELCOME, HOST_LINES } from '../components/game/HostAstronaut';
import Screen, { GlassCard } from '../components/ui/Screen';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import GradePicker, { ordinal } from '../components/GradePicker';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [lockedOpen, setLockedOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false); // grade chooser from the menu
  const router = useRouter();
  const [curr, setCurr] = useState(null); // { grade, skills } from /api/curriculum/me (null until loaded)
  const [scopedSkill, setScopedSkill] = useState(null); // times-table mission being practised (filters the problem list)
  const [pickedSkill, setPickedSkill] = useState(null); // mission tapped on the map (for the chooser / locked dialogs)

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

  // Grade missions (a kid picks a grade first, then gets the map)
  const fetchMissions = () => {
    axios.get('/api/curriculum/me', { withCredentials: true })
      .then((r) => setCurr({ grade: r.data?.grade ?? null, skills: Array.isArray(r.data?.skills) ? r.data.skills : [] }))
      .catch(() => setCurr({ grade: null, skills: [] }));
  };
  useEffect(() => { if (user) fetchMissions(); else setCurr(null); }, [user]);

  useEffect(() => {
    if (!user) return;
    let currentLevelProblems = [];
    if (scopedSkill && PROBLEM_SKILLS[scopedSkill]) {
      // a times-table mission: that skill's fact set from the same Problem rows, so Braylee's history still counts
      const match = PROBLEM_SKILLS[scopedSkill];
      currentLevelProblems = problems.filter((p) => { const ab = parseProblemText(p.problem); return ab && match(ab[0], ab[1]); });
    } else if (user.level === 1) {
      currentLevelProblems = problems.filter(p => {
        const [a, b] = p.problem.split(' x ').map(Number);
        return a <= 5 && b <= 5;
      });
    } else {
      currentLevelProblems = problems;
    }
    setFilteredProblems(shuffleArray(currentLevelProblems));
  }, [user, problems, scopedSkill]);

  const updateLevel = async (level) => {
    const { data } = await axios.post('/api/users/level', { level }, { withCredentials: true });
    setUser(prev => ({ ...(prev || {}), ...data }));
    return data;
  };

  // `stay: true` saves the new level but keeps the player on the results screen so the celebration can show
  const handleLevelUp = async ({ stay = false } = {}) => {
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

  const pickMission = (s) => {
    if (!s.unlocked) { setPickedSkill({ ...s, locked: true }); return; }
    if (s.source === 'problems') { setPickedSkill(s); return; }
    router.push(`/skill/${encodeURIComponent(s.id)}`);
  };
  const startScoped = (m) => { setScopedSkill(pickedSkill.id); setPickedSkill(null); setMode(m); };

  const resetGame = () => {
    setMode(null);
    setScopedSkill(null);
    if (user) {
      fetchMissions();
      fetchProblems();
      fetchAllAttemptSummaries();
      fetchProgressSummary();
    }
  };

  const centered = (children) => (
    <Screen className="items-center justify-center text-center">{children}</Screen>
  );

  if (loading || (user && problemsLoading)) {
    return centered(
      <>
        <motion.div aria-hidden="true" className="text-jumbo" animate={{ y: [0, -14, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>🚀</motion.div>
        <p role="status" className="text-title text-neon-cyan">{loading ? 'Loading…' : 'Loading problems…'}</p>
      </>
    );
  }

  if (!user) {
    return centered(
      <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4">
        <h1 className="text-hero text-neon-pink">Who&apos;s playing? 💖</h1>
        <p className="text-body text-ink-dim">Please sign in to start practicing.</p>
        <Button tone="lime" size="lg" href="/login">Go to Login</Button>
      </GlassCard>
    );
  }

  const content = (() => {
    if (mode === 'memorize') {
      return <MemorizeMode key={`memorize-${scopedSkill || ''}`} user={user} problems={filteredProblems} level={user.level} onReset={resetGame} />;
    }
    if (mode === 'practice') {
      return (
        <PracticeMode key={`practice-${scopedSkill || ''}`} scoped={!!scopedSkill} user={user} problems={filteredProblems} level={user.level} onReset={resetGame}
          attemptSummaries={attemptSummaries} setAttemptSummaries={setAttemptSummaries}
          userProgress={userProgress} setUserProgress={setUserProgress} />
      );
    }
    if (mode === 'testing') {
      return (
        <TestingMode key="testing" user={user} problems={filteredProblems} level={user.level} onLevelUp={handleLevelUp} onReset={resetGame}
          attemptSummaries={attemptSummaries} setAttemptSummaries={setAttemptSummaries} userProgress={userProgress} />
      );
    }
    if (curr && !curr.grade) {
      // First time (new guest seat, or Braylee before she has picked): ask the grade before anything else.
      return (
        <Screen key="grade" className="items-center justify-center text-center">
          <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4">
            <AstronautStage size={110} listen={false} className="relative" />
            <h1 className="text-hero text-neon-cyan text-glow">What grade are you in?</h1>
            <p className="text-body text-ink-dim">Pick yours and I&apos;ll choose the right missions.</p>
            <GradePicker onPicked={() => fetchMissions()} />
          </GlassCard>
        </Screen>
      );
    }
    const totalCount = filteredProblems.length;
    const completedCount = filteredProblems.filter(p => userProgress[p.id]).length;
    const canUseTesting = totalCount > 0 && completedCount === totalCount;
    const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const tile = 'flex min-h-[5rem] w-full items-center gap-4 rounded-bubble px-5 text-left text-title';
    return (
      <Screen key="menu">
        <Header onReset={resetGame} userName={user.name} menuLabel="Home" />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
          <div className="flex flex-col items-center text-center">
            {user.isGuest ? (
              <HostAstronaut size={92} layout="row" storageKey="host-welcomed" lines={[HOST_WELCOME, ...HOST_LINES]} className="mb-3 w-full max-w-sm" />
            ) : (
              <>
                <AstronautStage size={132} listen={false} className="relative mb-3" />
                <SpeechBubble text={`Welcome back, Cadet ${user.name}! 🚀`} className="mb-3 mt-1 max-w-[19rem]" />
              </>
            )}
            <h1 className="text-hero text-neon-cyan text-glow">Choose Your Mission</h1>
            <div className="mt-2"><LevelIndicator level={user.level} /></div>
          </div>
          {curr?.grade ? (
            <MissionMap grade={curr.grade} skills={curr.skills} onPick={pickMission} />
          ) : null}
          {curr?.grade ? <h2 className="-mb-2 text-title text-neon-cyan">More games</h2> : null}
          <motion.div
            className="flex w-full max-w-md flex-col gap-3"
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          >
            {[
              { key: 'memorize', label: 'Memorize', emoji: '🧠', tone: 'pink', onClick: () => setMode('memorize') },
              { key: 'practice', label: 'Practice', emoji: '✏️', tone: 'cyan', onClick: () => setMode('practice') },
              { key: 'spelling', label: 'Spelling Bee', emoji: '🐝', tone: 'amber', href: '/spelling-bee' },
            ].map((m) => (
              <motion.div key={m.key} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                <Button tone={m.tone} size="lg" href={m.href} onClick={m.onClick} className={tile}>
                  <span aria-hidden="true" className="text-number">{m.emoji}</span>{m.label}
                </Button>
              </motion.div>
            ))}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <Button
                tone={canUseTesting ? 'violet' : 'ghost'}
                size="lg"
                aria-disabled={!canUseTesting}
                aria-describedby="testing-progress"
                onClick={() => (canUseTesting ? setMode('testing') : setLockedOpen(true))}
                className={`${tile} ${canUseTesting ? '' : 'opacity-80'}`}
              >
                <span aria-hidden="true" className="text-number">{canUseTesting ? '🧪' : '🔒'}</span>Testing
              </Button>
              <div id="testing-progress" className="mt-2 px-2 text-center text-body text-ink-dim">
                <div className="mx-auto mb-1 h-3 w-full overflow-hidden rounded-full bg-space-800" role="progressbar" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={completedCount} aria-label="Practice progress">
                  <motion.div className="h-full rounded-full bg-neon-lime shadow-glow-lime" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                </div>
                {canUseTesting ? `All ${totalCount} completed. Testing unlocked!` : `Completed ${completedCount} / ${totalCount} to unlock Testing`}
              </div>
            </motion.div>
          </motion.div>
          {curr?.grade ? (
            <Button tone="ghost" onClick={() => setGradeOpen(true)}>
              <span aria-hidden="true">🎓</span> {ordinal(curr.grade)} grade · Change
            </Button>
          ) : null}
          <Button
            tone="ghost"
            onClick={async () => {
              try { await axios.post('/api/auth/logout', {}, { withCredentials: true }); } catch (_) {}
              await signOut({ callbackUrl: '/login' });
            }}
          >
            {user.isGuest ? 'Sign out' : 'Logout'}
          </Button>
        </div>
        <Modal
          open={gradeOpen}
          onClose={() => setGradeOpen(false)}
          title="What grade are you in?"
          actions={<Button tone="ghost" onClick={() => setGradeOpen(false)}>Cancel</Button>}
        >
          <GradePicker current={curr?.grade ?? null} onPicked={() => { setGradeOpen(false); fetchMissions(); }} />
        </Modal>
        <Modal
          open={lockedOpen}
          onClose={() => setLockedOpen(false)}
          title="Keep Practicing ✨"
          actions={<Button tone="cyan" size="lg" onClick={() => { setLockedOpen(false); setMode('practice'); }}>Go to Practice ✏️</Button>}
        >
          Answer every problem in this level at least once in Practice Mode to unlock Testing Mode.
        </Modal>
        <Modal
          open={!!pickedSkill}
          onClose={() => setPickedSkill(null)}
          title={pickedSkill?.locked ? 'Not yet, Cadet! 🔒' : 'Pick your way to play'}
          actions={pickedSkill?.locked ? (
            <Button tone="cyan" size="lg" onClick={() => setPickedSkill(null)}>OK</Button>
          ) : (
            <>
              <Button tone="cyan" size="lg" onClick={() => startScoped('practice')}>Practice ✏️</Button>
              <Button tone="pink" size="lg" onClick={() => startScoped('memorize')}>Memorize 🧠</Button>
              <Button tone="ghost" onClick={() => setPickedSkill(null)}>Cancel</Button>
            </>
          )}
        >
          {pickedSkill?.locked
            ? 'Finish the mission before this one to open it.'
            : pickedSkill?.name}
        </Modal>
      </Screen>
    );
  })();

  return <AnimatePresence mode="wait">{content}</AnimatePresence>;
}

export default function Page() {
  return <AppInner />;
}
