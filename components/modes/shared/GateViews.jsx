import Screen, { GlassCard } from '../../ui/Screen';
import Button from '../../ui/Button';

export function CenterScreen({ children, className = 'text-center' }) {
  return <Screen className={`items-center justify-center ${className}`.trim()}>{children}</Screen>;
}

/** "Who's playing?" card shown when nobody is signed in. */
export function SignInCard({ titleClass = 'text-neon-pink', message, className = '' }) {
  return (
    <GlassCard className={`flex w-full max-w-sm flex-col items-center gap-4 ${className}`.trim()}>
      <h1 className={`text-hero ${titleClass}`}>Who&apos;s playing? 💖</h1>
      {message && <p className="text-body text-ink-dim">{message}</p>}
      <Button tone="lime" size="lg" href="/login">Go to Login</Button>
    </GlassCard>
  );
}
