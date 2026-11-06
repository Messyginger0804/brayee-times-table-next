"use client";
import Button from './ui/Button';
import AstronautHelmet from './space/AstronautHelmet';
import { BrayleeFace } from './braylee/BrayleeCheer';
import SignOutButton from './SignOutButton';
import { useCheerMuted } from '../lib/cheerVoice';

/** Top bar: avatar + greeting on the left, menu action on the right. */
function Header({ onReset, userName, menuLabel = 'Menu' }) {
  const [muted, setMuted] = useCheerMuted();
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <AstronautHelmet size={52} float={false} />
        <p className="truncate text-lead font-bold">
          <span className="text-ink-dim">Cadet </span>
          <span className="text-neon-cyan">{userName}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle button: fixed label, aria-pressed = Braylee's voice is on */}
        <Button tone="ghost" size="sm" onClick={() => setMuted(!muted)} aria-pressed={!muted} aria-label="Braylee's voice" title={muted ? "Turn Braylee's voice on" : "Turn Braylee's voice off"}>
          <span aria-hidden="true" className="flex items-center gap-1.5">
            <BrayleeFace size={28} />
            {muted ? '🔇' : '🔊'}
          </span>
        </Button>
        <Button tone="ghost" size="sm" onClick={onReset} aria-label="Back to main menu">
          <span aria-hidden="true">🏠</span> {menuLabel}
        </Button>
        <SignOutButton />
      </div>
    </header>
  );
}

export default Header;
