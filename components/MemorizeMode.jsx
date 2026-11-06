"use client";
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './Header';
import Screen from './ui/Screen';
import Button from './ui/Button';
import LevelIndicator from './LevelIndicator';
import NoProblemsScreen from './modes/drill/NoProblemsScreen';
import { emoji } from '../lib/emoji';

const prettyProblem = (p) => String(p).replace(/\s*x\s*/i, ' × ');

function MemorizeMode({ user, problems, level, onReset }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const next = () => { setFlipped(false); setIndex((i) => (i + 1) % problems.length); };

  if (problems.length === 0) return <NoProblemsScreen user={user} onReset={onReset} />;

  const card = problems[index];
  const face = 'absolute inset-0 flex flex-col items-center justify-center rounded-bubble border-2 [backface-visibility:hidden]';

  return (
    <Screen>
      <Header onReset={onReset} userName={user?.name} userImage={user?.image} />
      <div className="flex flex-col items-center gap-1 pt-1">
        <h1 className="text-title text-neon-pink">Memorize 🧠</h1>
        <LevelIndicator level={level} />
        <p className="text-body text-ink-dim">Card {index + 1} of {problems.length}</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-4">
        <div className="[perspective:1000px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.button
              key={card.id}
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? `${prettyProblem(card.problem)} equals ${card.answer}. Tap to flip back.` : `${prettyProblem(card.problem)}. Tap to reveal the answer.`}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative block h-56 w-[min(20rem,86vw)]"
            >
              <motion.div
                className="absolute inset-0 [transform-style:preserve-3d]"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              >
                <div className={`${face} border-neon-cyan bg-space-800/90 shadow-glow-cyan`}>
                  <span className="text-jumbo">{prettyProblem(card.problem)}</span>
                  <span className="mt-2 text-body text-ink-dim">Tap to flip 👆</span>
                </div>
                <div className={`${face} border-neon-lime bg-space-800/90 shadow-glow-lime [transform:rotateY(180deg)]`}>
                  <span className="text-body text-ink-dim">{prettyProblem(card.problem)} =</span>
                  <span className="text-jumbo text-neon-lime text-glow">{card.answer}</span>
                </div>
              </motion.div>
            </motion.button>
          </AnimatePresence>
        </div>
      </div>
      <div className="flex justify-center pt-4">
        <Button tone="violet" size="lg" onClick={next} className="w-full max-w-xs">Next {emoji.next()}</Button>
      </div>
    </Screen>
  );
}

export default MemorizeMode;
