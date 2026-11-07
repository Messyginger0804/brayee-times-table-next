import Screen from '../../ui/Screen';
import Button from '../../ui/Button';

export function CenterScreen({ children, className = 'text-center' }) {
  return <Screen className={`items-center justify-center ${className}`.trim()}>{children}</Screen>;
}

/** Shown when Mission Control (the server) did not answer. Never a reason to sign out or ask for the grade again. */
export function UnreachablePanel({ onRetry, message = "Mission Control isn't answering." }) {
  return (
    <CenterScreen>
      <div aria-hidden="true" className="text-jumbo">🛰️</div>
      <p role="alert" className="text-title text-neon-amber">{message}</p>
      <p className="text-body text-ink-dim">Try again?</p>
      <Button tone="cyan" size="lg" onClick={onRetry}>Try again 🔁</Button>
    </CenterScreen>
  );
}
