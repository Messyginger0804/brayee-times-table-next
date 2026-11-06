"use client";
import { motion } from 'framer-motion';
import Screen, { GlassCard } from '../../ui/Screen';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import Header from '../../Header';
import Keypad from '../../game/Keypad';
import ChoicePad from '../../game/ChoicePad';
import QuestionCard from '../../game/QuestionCard';
import GameHud from '../../game/GameHud';
import { GifSlot } from '../../gif/GifProvider';
import { progressPct } from './skillLogic';

/** Shown when the skill is missing or still locked. */
export function SkillBlocked({ skill, onBack }) {
  const locked = !!skill && !skill.unlocked;
  return (
    <GlassCard className="flex w-full max-w-sm flex-col items-center gap-4">
      <h1 className="text-title text-neon-amber">{locked ? 'This mission is still locked 🔒' : 'Mission not found'}</h1>
      <p className="text-body text-ink-dim">{locked ? 'Finish the mission before it to open this one.' : 'Head back and pick another planet.'}</p>
      <Button tone="cyan" size="lg" onClick={onBack}>Back to missions</Button>
    </GlassCard>
  );
}

function LevelProgress({ title, levelIndex, levelCount, levelName, prog }) {
  const lastLevel = levelIndex >= levelCount - 1;
  return (
    <div className="mx-auto w-full max-w-sm px-1 pt-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-bold text-neon-amber">{title}</span>
        <span className="shrink-0 text-ink-dim">Level {levelIndex + 1} of {levelCount}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-space-800" role="progressbar" aria-valuemin={0} aria-valuemax={prog.need} aria-valuenow={prog.have}
        aria-label={lastLevel ? 'Progress to mastering this mission' : 'Progress to the next level'}>
        <motion.div className="h-full rounded-full bg-neon-amber" animate={{ width: `${progressPct(prog)}%` }} transition={{ duration: 0.5 }} />
      </div>
      {levelName && <p className="mt-0.5 truncate text-xs text-ink-dim">{levelName}</p>}
    </div>
  );
}

function AnswerPad({ keypad, typed, setTyped, submit, disabled }) {
  if (!keypad) return null;
  if (keypad.digits) return <Keypad value={typed} onChange={setTyped} onSubmit={() => submit()} disabled={disabled} extras={keypad} />;
  return <ChoicePad choices={keypad.choices || []} onPick={(c) => submit(c)} disabled={disabled} />;
}

function SkillModal({ modal, title, onClose, onBack }) {
  const mastered = modal?.kind === 'mastered';
  const actions = mastered ? (
    <>
      <Button tone="lime" size="lg" onClick={onBack}>Back to missions 🪐</Button>
      <Button tone="ghost" onClick={onClose}>Keep practicing</Button>
    </>
  ) : (
    <Button tone="lime" size="lg" onClick={onClose}>Keep going ✨</Button>
  );
  return (
    <Modal open={!!modal} onClose={onClose} title={mastered ? 'Mission complete! 🏆' : `Level ${modal?.level} unlocked! 🚀`} actions={actions}>
      <p className="text-lead font-bold text-ink">
        {mastered ? `You mastered ${title}! 🌟` : 'Great job! The next problems are a little trickier.'}
      </p>
    </Modal>
  );
}

export function SkillPlay({ skill, user, game, levelIndex, prog, title, onBack }) {
  const { problem, qn, typed, setTyped, status, hint, note, streak, stars, modal, submit, closeModal } = game;
  return (
    <Screen>
      <Header onReset={onBack} userName={user?.name} menuLabel="Missions" />
      <h1 className="sr-only">{skill.name}</h1>
      <GameHud streak={streak} score={stars} />
      <GifSlot />
      <LevelProgress title={title} levelIndex={levelIndex} levelCount={skill.levelCount} levelName={skill.levelNames?.[levelIndex]} prog={prog} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:pt-2">
        {problem && (
          <QuestionCard id={`q${qn}`} problem={problem.prompt} parts={problem.promptParts}
            answer={problem.answerDisplay} typed={typed} status={status} hint={hint} timeLimit={problem.timeLimit} />
        )}
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="min-h-[1.5rem] text-body font-bold text-neon-amber" role="status">{note}</p>
        <AnswerPad keypad={problem?.keypad} typed={typed} setTyped={setTyped} submit={submit} disabled={!!status || !!modal} />
      </div>
      <SkillModal modal={modal} title={title} onClose={closeModal} onBack={onBack} />
    </Screen>
  );
}
