"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import MemorizeMode from '../components/MemorizeMode';
import PracticeMode from '../components/PracticeMode';
import TestingMode from '../components/TestingMode';
import { CenterScreen } from '../components/modes/shared/GateViews';
import { GradeGate, MenuScreen } from '../components/modes/shared/HomeMenu';
import { useAuthUser, useLoginRedirect } from '../components/modes/shared/useAuthUser';
import { useLevelUp } from '../components/modes/shared/useLevelUp';
import { useHomeData } from '../components/modes/shared/useHomeData';
import { makePickMission, testingStats } from '../components/modes/shared/homeLogic';
import CadetWelcome, { useCadetWelcome } from '../components/CadetWelcome';
import { AnimatePresence, motion } from 'framer-motion';
import { useSceneKind } from '../lib/sceneFx';

/** Re-fetch everything the menu shows (no-op until signed in). */
function refreshHome(user, data) {
  if (!user) return;
  data.fetchMissions();
  data.fetchProblems();
  data.fetchAllAttemptSummaries();
  data.fetchProgressSummary();
}

/** Back to the menu: clear the mode and scoped mission, then refresh what the menu shows. */
const makeResetGame = ({ user, data, setMode, setScopedSkill }) => () => {
  setMode(null);
  setScopedSkill(null);
  refreshHome(user, data);
};

/** Tells the shared 3D canvas which screen is up (a component, so AppInner's hook count stays put). */
function SceneKind({ mode }) {
  useSceneKind(mode ? 'game' : 'home');
  return null;
}

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
  if (ui.cadetWelcome) return null; // one overlay at a time: the cadet popup goes first, grade picker / menu only after it
  const modeView = MODE_VIEWS[mode];
  if (modeView) return modeView(ctx);
  if (data.curr && !data.curr.grade) return <GradeGate key="grade" onPicked={() => actions.fetchMissions()} />;
  return <MenuScreen key="menu" user={user} curr={data.curr} stats={testingStats(ctx.filteredProblems, data.userProgress)} ui={ui} actions={actions} />;
}

function AppInner() {
  const { status } = useSession();
  const [user, setUser] = useAuthUser(status);
  useLoginRedirect(status);
  const loading = status === 'loading';
  const [cadetWelcome, closeCadetWelcome] = useCadetWelcome();
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

  const resetGame = makeResetGame({ user, data, setMode, setScopedSkill });

  if (loading || !user || problemsLoading) return <LoadingView loading={loading || !user} />;

  const ctx = { user, scopedSkill, filteredProblems, resetGame, handleLevelUp, data };
  const ui = { cadetWelcome, gradeOpen, lockedOpen, pickedSkill, setGradeOpen, setLockedOpen, setPickedSkill };
  const actions = { reset: resetGame, setMode, pickMission, startScoped, fetchMissions };
  const content = pickContent(mode, ctx, ui, actions);

  return (
    <>
      <SceneKind mode={mode} />
      <AnimatePresence mode="wait">{content}</AnimatePresence>
      <CadetWelcome welcome={cadetWelcome} onClose={closeCadetWelcome} />
    </>
  );
}

export default function Page() {
  return <AppInner />;
}
