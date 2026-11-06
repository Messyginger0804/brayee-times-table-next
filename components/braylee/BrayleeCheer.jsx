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
 *   speak   true = say the line aloud once per line via lib/cheerVoice (respects the mute toggle, throttled, and
 *           never over Spelling Bee speech). Default false.
 *   className  extra classes on the wrapper.
 * The line is picked after mount (no hydration mismatch) and stays stable until `moment`, `n`, `name` or `line` change.
 *
 * <BrayleeFace size alt className /> is only the circular photo (host avatar, emoji fallback), for small spots.
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import Astronaut from '../space/Astronaut';
import { useAvatarSrc } from '../space/AstronautHelmet';
import { SpeechBubble } from '../game/HostAstronaut';
import { pickLine } from '../../config/brayleeLines';
import { speakCheer } from '../../lib/cheerVoice';

export function BrayleeFace({ size = 40, alt = 'Braylee', className = '' }) {
  const src = useAvatarSrc(size, true);
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full border-2 border-neon-cyan bg-space-700 shadow-glow-cyan ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" style={{ objectPosition: '50% 40%' }} />
      ) : (
        <span role="img" aria-label={alt} className="flex h-full w-full items-center justify-center" style={{ fontSize: size * 0.55 }}>👩‍🚀</span>
      )}
    </span>
  );
}

export default function BrayleeCheer({ moment = 'idle', n, name, pose = 'welcome', size = 120, layout = 'stack', line, speak = false, className = '' }) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState('');
  const text = line ?? picked;

  useEffect(() => {
    if (line == null) setPicked(pickLine(moment, { n, name }));
  }, [moment, n, name, line]);

  useEffect(() => {
    if (speak && text) speakCheer(text);
  }, [speak, text]);

  const row = layout === 'row';
  return (
    <div className={`flex ${row ? 'flex-row items-center gap-3' : 'flex-col items-center gap-2'} ${className}`}>
      <div className="shrink-0">
        <Astronaut host hostAlt="Braylee" pose={reduce ? 'idle' : pose} size={size} />
      </div>
      <SpeechBubble text={text} tail={row ? 'left' : 'top'} className={row ? 'min-w-0 flex-1' : 'w-full max-w-[19rem]'} />
    </div>
  );
}
