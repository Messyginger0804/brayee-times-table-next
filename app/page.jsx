"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import MemorizeMode from '../components/MemorizeMode';
import PracticeMode from '../components/PracticeMode';
import TestingMode from '../components/TestingMode';
import { CenterScreen, SignInCard } from '../components/modes/shared/GateViews';
import { GradeGate, MenuScreen } from '../components/modes/shared/HomeMenu';
import { useAuthUser } from '../components/modes/shared/useAuthUser';
import { useLevelUp } from '../components/modes/shared/useLevelUp';
import { useHomeData } from '../components/modes/shared/useHomeData';
import { makePickMission, testingStats } from '../components/modes/shared/homeLogic';
import { AnimatePresence, motion } from 'framer-motion';

function LoadingView({ loading }) {
  return (
    <CenterScreen>
      <motion.div aria-hidden="true" className="text-jumbo" animate={{ y: [0, -14, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>🚀</motion.div>
      <p role="status" className="text-title text-neon-cyan">{loading ? 'Loading…' : 'Loading problems…'}</p>
    </CenterScreen>
  );
}

// Game screens keyed by mode; the player's data and callbacks arrive in one context object.
const MODE_VIEWS = {
  memorize: ({ user, scopedSkill, filteredProblems, resetGame }) => (
    <MemorizeMode key={`memorize-${scopedSkill || ''}`} user={user} problems={filteredProblems} level={user.level} onReset={resetGame} />
  ),
  practice: ({ user, scopedSkill, filteredProblems, resetGame, data }) => (
    <PracticeMode key={`practice-${scopedSkill || ''}`} scoped={!!scopedSkill} user={user} problems={filteredProblems} level={user.level} onReset={resetGame}
      attemptSummaries={data.attemptSummaries} setAttemptSummaries={data.setAttemptSummaries}
      userProgress={data.userProgress} setUserProgress={data.setUserProgress} />
  ),
  testing: ({ user, filteredProblems, resetGame, handleLevelUp, data }) => (
    <TestingMode key="testing" user={user} problems={filteredProblems} level={user.level} onLevelUp={handleLevelUp} onReset={resetGame}
      attemptSummaries={data.attemptSummaries} setAttemptSummaries={data.setAttemptSummaries} userProgress={data.userProgress} />
  ),
};

function pickContent(mode, ctx, ui, actions) {
  const { user, data } = ctx;
  const modeView = MODE_VIEWS[mode];
  if (modeView) return modeView(ctx);
  if (data.curr && !data.curr.grade) return <GradeGate key="grade" onPicked={() => actions.fetchMissions()} />;
  return <MenuScreen key="menu" user={user} curr={data.curr} stats={testingStats(ctx.filteredProblems, data.userProgress)} ui={ui} actions={actions} />;
}

function AppInner() {
  const { status } = useSession();
  const [user, setUser] = useAuthUser(status);
  const loading = status === 'loading';
  const [mode, setMode] = useState(null);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false); // grade chooser from the menu
  const router = useRouter();
  const [scopedSkill, setScopedSkill] = useState(null); // times-table mission being practised (filters the problem list)
  const [pickedSkill, setPickedSkill] = useState(null); // mission tapped on the map (for the chooser / locked dialogs)
  const data = useHomeData(user, scopedSkill);
  const { filteredProblems, problemsLoading, fetchProblems, fetchMissions } = data;

  const handleLevelUp = useLevelUp({ user, setUser, setMode, fetchProblems });

  const pickMission = makePickMission(router, setPickedSkill);
  const startScoped = (m) => { setScopedSkill(pickedSkill.id); setPickedSkill(null); setMode(m); };

  const resetGame = () => {
    setMode(null);
    setScopedSkill(null);
    if (!user) return;
    fetchMissions();
    fetchProblems();
    data.fetchAllAttemptSummaries();
    data.fetchProgressSummary();
  };

  if (loading || (user && problemsLoading)) return <LoadingView loading={loading} />;
  if (!user) {
    return (
      <CenterScreen>
        <SignInCard message="Please sign in to start practicing." />
      </CenterScreen>
    );
  }

  const ctx = { user, scopedSkill, filteredProblems, resetGame, handleLevelUp, data };
  const ui = { gradeOpen, lockedOpen, pickedSkill, setGradeOpen, setLockedOpen, setPickedSkill };
  const actions = { reset: resetGame, setMode, pickMission, startScoped, fetchMissions };
  const content = pickContent(mode, ctx, ui, actions);

  return <AnimatePresence mode="wait">{content}</AnimatePresence>;
}

export default function Page() {
  return <AppInner />;
}
