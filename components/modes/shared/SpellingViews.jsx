"use client";
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/Screen';
import Button from '../../ui/Button';
import { unitsFor, kidTitle, TIERS } from '../../../lib/spellingUnits';
import { gradeLabel, hiddenSentence, speakWord } from './spellingLogic';

const chip = (on) => `min-h-12 rounded-chunk px-3 text-body font-bold border ${on ? 'border-neon-amber bg-neon-amber text-space-950' : 'border-white/20 bg-space-800/80 text-ink'}`;

function GradeFieldset({ pick, setPick }) {
  return (
    <fieldset>
      <legend className="mb-2 text-lead font-bold text-neon-cyan">Grade</legend>
      <div className="grid grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((g) => (
          <button key={g} type="button" aria-pressed={pick.grade === g} aria-label={`${gradeLabel(g)} grade`} className={chip(pick.grade === g)}
            onClick={() => setPick({ grade: g, tier: pick.tier, unit: '' })}>{g}</button>
        ))}
      </div>
    </fieldset>
  );
}

function TierFieldset({ pick, setPick }) {
  return (
    <fieldset>
      <legend className="mb-2 text-lead font-bold text-neon-cyan">Words</legend>
      <div className="grid grid-cols-2 gap-2">
        {TIERS.map((t) => (
          <button key={t.id || 'all'} type="button" aria-pressed={pick.tier === t.id} className={chip(pick.tier === t.id)}
            onClick={() => setPick({ ...pick, tier: t.id, unit: '' })}><span aria-hidden="true">{t.emoji}</span> {t.label}</button>
        ))}
      </div>
    </fieldset>
  );
}

function UnitSelect({ pick, setPick, units }) {
  const unit = units.find((u) => u.id === pick.unit);
  return (
    <div>
      <label htmlFor="unit" className="mb-2 block text-lead font-bold text-neon-cyan">Spelling pattern</label>
      <select id="unit" value={pick.unit} onChange={(e) => setPick({ ...pick, unit: e.target.value })}
        className="min-h-12 w-full rounded-chunk border-2 border-white/25 bg-space-900/80 px-3 text-body text-ink focus:border-neon-cyan focus:outline-none">
        <option value="">All patterns</option>
        {units.map((u) => <option key={u.id} value={u.id}>{kidTitle(u)}</option>)}
      </select>
      {unit && <p className="mt-2 line-clamp-4 text-sm text-ink-dim">{unit.rule}</p>}
    </div>
  );
}

const countText = (count) => (count == null ? 'Finding words…' : `${count} word${count === 1 ? '' : 's'} ready`);

/** Grade / kind of words / spelling pattern. Only for kids with a grade; others keep the one-button start. */
function WordPicker({ pick, setPick, count }) {
  const units = pick.tier === 'core' ? unitsFor(pick.grade, 'core') : [];
  return (
    <GlassCard className="w-full max-w-md space-y-3">
      <GradeFieldset pick={pick} setPick={setPick} />
      <TierFieldset pick={pick} setPick={setPick} />
      {units.length > 0 && <UnitSelect pick={pick} setPick={setPick} units={units} />}
      <p role="status" className="text-center text-body text-ink-dim">{countText(count)}</p>
    </GlassCard>
  );
}

export function StartPanel({ myGrade, pick, setPick, wordsReady, wordCount, onStart }) {
  const empty = wordsReady && !wordCount;
  return (
    <>
      {myGrade && <WordPicker pick={pick} setPick={setPick} count={wordsReady ? wordCount : null} />}
      <Button tone="amber" size="lg" onClick={onStart} disabled={!wordsReady || !wordCount} className={`w-full max-w-xs text-title ${myGrade ? 'sticky bottom-3 z-30' : ''}`}>Start Round ▶️🎤</Button>
      {empty && <p role="status" className="text-body text-neon-amber">No words here yet. Try another pick!</p>}
    </>
  );
}

function WordCard({ data }) {
  return (
    <GlassCard className="mb-4 space-y-2 text-left">
      <p><span className="font-bold text-neon-cyan">Part of speech:</span> {data.partOfSpeech}</p>
      <p><span className="font-bold text-neon-cyan">Definition:</span> {data.definition}</p>
      <p>
        <span className="font-bold text-neon-cyan">Sentence:</span>{' '}
        {hiddenSentence(data.sentence, data.word)}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button tone="cyan" size="sm" onClick={() => speakWord(`Spell: ${data.word}`)}>🔊 Hear word</Button>
        <Button tone="violet" size="sm" onClick={() => speakWord(data.sentence)}>🔊 Hear sentence</Button>
      </div>
    </GlassCard>
  );
}

const FIELD = 'w-full min-h-[3.5rem] rounded-chunk border-2 bg-space-900/80 px-4 text-center text-title text-ink placeholder:text-ink-dim/70 focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';

function fieldTone(result) {
  if (!result) return 'border-white/25 focus:border-neon-cyan';
  return result.correct ? 'border-neon-lime' : 'border-neon-coral';
}

function RoundMessage({ hint, result }) {
  return (
    <p className="min-h-[1.75rem] text-center text-lead font-bold" role="status">
      {hint && <span className="text-neon-amber">{hint}</span>}
      {result?.correct && <span className="text-neon-lime">Correct! ⭐</span>}
      {result && !result.correct && <span className="text-neon-amber">The word was <strong>{result.word}</strong>. You got this! 💪</span>}
    </p>
  );
}

function AnswerForm({ round }) {
  const { userAnswer, setUserAnswer, result, hint, inputRef, handleSubmit } = round;
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="spelling" className="sr-only">Type your spelling</label>
      <input
        id="spelling" ref={inputRef} type="text" value={userAnswer} disabled={!!result}
        onChange={(e) => setUserAnswer(e.target.value)}
        placeholder="Type your spelling here"
        autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="done"
        className={`${FIELD} ${fieldTone(result)}`}
      />
      <RoundMessage hint={hint} result={result} />
      <Button type="submit" tone="lime" size="lg" disabled={!!result} className="w-full">Submit Spelling ✓</Button>
    </form>
  );
}

export function RoundPanel({ round, myGrade }) {
  const { currentWordData, result, changeWords } = round;
  const shake = result && !result.correct;
  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={shake ? { x: [0, -8, 8, -5, 5, 0], opacity: 1 } : { x: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <WordCard data={currentWordData} />
      <AnswerForm round={round} />
      {myGrade && (
        <Button tone="ghost" size="sm" className="mt-3 w-full" onClick={changeWords}>
          <span aria-hidden="true">⚙️</span> Change words
        </Button>
      )}
    </motion.div>
  );
}
