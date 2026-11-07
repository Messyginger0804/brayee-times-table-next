"use client";
/**
 * Braylee cheering: her face (Astronaut with the host photo) plus a speech bubble.
 *
 * <BrayleeCheer moment pose size layout line speak className />
 *   moment  key of config/brayleeLines.js (session, correct, streak, levelUp, mastered, wrong, testPass, gameOver,
 *           spellingCorrect, spellingWrong, unlock, locked, mapNudge, idle, welcomeGuest, welcomeBack). Default 'idle'.
 *   n, name fill {n} / {name} for the 'streak' / 'welcomeBack' lines.
 *   line    exact text; overrides `moment` (no random pick).
 *   pose    Astronaut pose: idle | welcome | correct | streak | tryAgain | levelUp. Default 'welcome'.
 *           Reduced motion forces 'idle'.
 *   size    astronaut width in px (default 120).   layout  'stack' (bubble under, default) | 'row' (bubble beside).
 *   speak   true = say the line aloud once per line via lib/cheerVoice (a big moment: beats ordinary cheers, respects the
 *           mute toggle, and never goes over Spelling Bee speech). Default false.
 *   className  extra classes on the wrapper.
 * The line is picked after mount (no hydration mismatch) and stays stable until `moment`, `n`, `name` or `line` change.
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import Astronaut from '../space/Astronaut';
import { SpeechBubble } from '../game/HostAstronaut';
import { pickLine } from '../../config/brayleeLines';
import { speakBigCheer } from '../../lib/cheerVoice';

export default function BrayleeCheer({ moment = 'idle', n, name, pose = 'welcome', size = 120, layout = 'stack', line, speak = false, className = '' }) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState('');
  const text = line ?? picked;

  useEffect(() => {
    if (line == null) setPicked(pickLine(moment, { n, name }));
  }, [moment, n, name, line]);

  useEffect(() => {
    if (speak && text) speakBigCheer(text);
  }, [speak, text]);

  const row = layout === 'row';
  return (
    <div className={`flex ${row ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'} ${className}`}>
      <div className="shrink-0">
        <Astronaut host hostAlt="Braylee" pose={reduce ? 'idle' : pose} size={size} />
      </div>
      <SpeechBubble replay={speak} text={text} tail={row ? 'left' : 'top'} className={row ? 'min-w-0 flex-1' : 'w-full max-w-[19rem]'} />
    </div>
  );
}
