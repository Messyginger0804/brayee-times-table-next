"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '../../Header';
import LevelIndicator from '../../LevelIndicator';
import MissionMap from '../../MissionMap';
import GradePicker, { ordinal } from '../../GradePicker';
import AstronautStage from '../../game/AstronautStage';
import BrayleeCheer from '../../braylee/BrayleeCheer';
import HostAstronaut, { HOST_WELCOME, HOST_LINES, SpeechBubble } from '../../game/HostAstronaut';
import { pickLine } from '../../../config/brayleeLines';
import Screen, { GlassCard } from '../../ui/Screen';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import SaveCadet from '../../SaveCadet';
import { testingCopy } from './homeLogic';
import { sceneFx, useScenePopup } from '../../../lib/sceneFx';

const TILE = 'flex min-h-[5rem] w-full items-center gap-4 rounded-bubble px-5 text-left text-title';
const ITEM = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const MODE_TILES = [
  { key: 'memorize', label: 'Memorize', emoji: '🧠', tone: 'pink', mode: 'memorize' },
  { key: 'practice', label: 'Practice', emoji: '✏️', tone: 'cyan', mode: 'practice' },
  { key: 'spelling', label: 'Spelling Bee', emoji: '🐝', tone: 'amber', href: '/spelling-bee' },
];

/** First time (new guest seat, or Braylee before she has picked): ask the grade before anything else. */
export function GradeGate({ onPicked }) {
  useScenePopup(true);
  return (
    <Screen className="items-center justify-center text-center">
      <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4">
        <AstronautStage size={110} listen={false} className="relative" />
        <h1 className="text-hero text-neon-cyan text-glow">What grade are you in?</h1>
        <p className="text-body text-ink-dim">Pick yours and I&apos;ll choose the right missions.</p>
        <GradePicker onPicked={onPicked} />
      </GlassCard>
    </Screen>
  );
}

/** Braylee's own home: her photo is already in the header, so she gets just the greeting bubble, no second face. */
function OwnWelcome({ name }) {
  const [line, setLine] = useState('');
  useEffect(() => setLine(pickLine('welcomeBack', { name })), [name]);
  return <SpeechBubble text={line} tail="none" className="mb-2 w-full max-w-[19rem]" />;
}

/** Guests and saved cadets get the one host astronaut; her rotating lines ("Pick a mission, Cadet!") live in her bubble. */
function Welcome({ user }) {
  if (user.isGuest || user.isSaved) {
    return <HostAstronaut size={92} layout="row" storageKey="host-welcomed" lines={[HOST_WELCOME, ...HOST_LINES]} className="mb-2 w-full max-w-sm" />;
  }
  return <OwnWelcome name={user.name} />;
}

function TestingTile({ stats, onTest, onLocked }) {
  const { canUseTesting, totalCount, completedCount, pct } = stats;
  return (
    <motion.div variants={ITEM}>
      <Button
        tone={canUseTesting ? 'violet' : 'ghost'}
        size="lg"
        aria-disabled={!canUseTesting}
        aria-describedby="testing-progress"
        onClick={canUseTesting ? onTest : onLocked}
        className={`${TILE} ${canUseTesting ? '' : 'opacity-80'}`}
      >
        <span aria-hidden="true" className="text-number">{canUseTesting ? '🧪' : '🔒'}</span>Testing
      </Button>
      <div id="testing-progress" className="mt-2 px-2 text-center text-body text-ink-dim">
        <div className="mx-auto mb-1 h-3 w-full overflow-hidden rounded-full bg-space-800" role="progressbar" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={completedCount} aria-label="Practice progress">
          <motion.div className="h-full rounded-full bg-neon-lime shadow-glow-lime" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
        </div>
        {testingCopy(stats)}
      </div>
    </motion.div>
  );
}

function ModeTiles({ stats, onMode, onLocked }) {
  return (
    <motion.div className="flex w-full max-w-md flex-col gap-3" initial="hidden" animate="show" variants={LIST}>
      {MODE_TILES.map((m) => (
        <motion.div key={m.key} variants={ITEM}>
          <Button tone={m.tone} size="lg" href={m.href} onClick={m.mode ? () => onMode(m.mode) : undefined} className={TILE}>
            <span aria-hidden="true" className="text-number">{m.emoji}</span>{m.label}
          </Button>
        </motion.div>
      ))}
      <TestingTile stats={stats} onTest={() => onMode('testing')} onLocked={onLocked} />
    </motion.div>
  );
}

function PickedSkillModal({ picked, onClose, onStart }) {
  const locked = !!picked?.locked;
  const actions = locked ? (
    <Button tone="cyan" size="lg" onClick={onClose}>OK</Button>
  ) : (
    <>
      <Button tone="cyan" size="lg" onClick={() => onStart('practice')}>Practice ✏️</Button>
      <Button tone="pink" size="lg" onClick={() => onStart('memorize')}>Memorize 🧠</Button>
      <Button tone="ghost" onClick={onClose}>Cancel</Button>
    </>
  );
  return (
    <Modal open={!!picked} onClose={onClose} title={locked ? 'Not yet, Cadet! 🔒' : 'Pick your way to play'} actions={actions}>
      {locked && <BrayleeCheer moment="locked" pose="tryAgain" size={88} speak className="mb-3" />}
      {locked ? 'Finish the mission before this one to open it.' : picked?.name}
    </Modal>
  );
}

function MenuModals({ curr, gradeOpen, lockedOpen, picked, onGradePicked, onCloseGrade, onCloseLocked, onPractice, onClosePicked, onStartScoped }) {
  return (
    <>
      <Modal
        open={gradeOpen}
        onClose={onCloseGrade}
        title="What grade are you in?"
        actions={<Button tone="ghost" onClick={onCloseGrade}>Cancel</Button>}
      >
        <GradePicker current={curr?.grade ?? null} onPicked={onGradePicked} />
      </Modal>
      <Modal
        open={lockedOpen}
        onClose={onCloseLocked}
        title="Keep Practicing ✨"
        actions={<Button tone="cyan" size="lg" onClick={onPractice}>Go to Practice ✏️</Button>}
      >
        Answer every problem in this level at least once in Practice Mode to unlock Testing Mode.
      </Modal>
      <PickedSkillModal picked={picked} onClose={onClosePicked} onStart={(m) => sceneFx.whoosh(picked.id, () => onStartScoped(m))} />
    </>
  );
}

export function MenuScreen({ user, curr, stats, ui, actions }) {
  const grade = curr?.grade;
  return (
    <Screen>
      <Header onReset={actions.reset} userName={user.name} menuLabel="Home" photo={!user.isGuest && !user.isSaved} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2">
        <div className="flex flex-col items-center text-center">
          <Welcome user={user} />
          <h1 className="text-hero text-neon-cyan text-glow">Choose Your Mission</h1>
          <div className="mt-1"><LevelIndicator level={user.level} /></div>
        </div>
        {grade ? <MissionMap grade={grade} skills={curr.skills} onPick={actions.pickMission} /> : null}
        {grade ? <h2 className="-mb-2 text-title text-neon-cyan">More games</h2> : null}
        <ModeTiles stats={stats} onMode={actions.setMode} onLocked={() => ui.setLockedOpen(true)} />
        {grade ? (
          <Button tone="ghost" onClick={() => ui.setGradeOpen(true)}>
            <span aria-hidden="true">🎓</span> {ordinal(grade)} grade · Change
          </Button>
        ) : null}
        {user.isGuest ? <SaveCadet /> : null}
      </div>
      <MenuModals
        curr={curr}
        gradeOpen={ui.gradeOpen}
        lockedOpen={ui.lockedOpen}
        picked={ui.pickedSkill}
        onCloseGrade={() => ui.setGradeOpen(false)}
        onGradePicked={() => { ui.setGradeOpen(false); actions.fetchMissions(); }}
        onCloseLocked={() => ui.setLockedOpen(false)}
        onPractice={() => { ui.setLockedOpen(false); actions.setMode('practice'); }}
        onClosePicked={() => ui.setPickedSkill(null)}
        onStartScoped={actions.startScoped}
      />
    </Screen>
  );
}
