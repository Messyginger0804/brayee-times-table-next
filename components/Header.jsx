"use client";
import Button from './ui/Button';
import AstronautHelmet from './space/AstronautHelmet';

/** Top bar: avatar + greeting on the left, menu action on the right. */
function Header({ onReset, userName, menuLabel = 'Menu' }) {
  return (
    <header className="flex w-full items-center justify-between gap-2 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <AstronautHelmet size={52} float={false} />
        <p className="truncate text-lead font-bold">
          <span className="text-ink-dim">Cadet </span>
          <span className="text-neon-cyan">{userName}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button tone="ghost" size="sm" onClick={onReset} aria-label="Back to main menu">
          <span aria-hidden="true">🏠</span> {menuLabel}
        </Button>
      </div>
    </header>
  );
}

export default Header;
