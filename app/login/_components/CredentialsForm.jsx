"use client";
import Button from '../../../components/ui/Button';
import ShakeError from './ShakeError';

const fieldCls = 'w-full min-h-[3.25rem] rounded-chunk border-2 border-white/20 bg-space-900/80 px-4 text-lead text-ink placeholder:text-ink-dim/80 focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';

export default function CredentialsForm({ name, setName, pin, setPin, error, loading, onSubmit, onBack }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="cadet-name" className="mb-1 block text-body font-bold">Your cadet name</label>
        <input id="cadet-name" className={fieldCls} value={name} maxLength={16} autoComplete="username" autoCapitalize="words" autoFocus
          onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="pin" className="mb-1 block text-body font-bold">Your secret number</label>
        <input id="pin" type="password" className={`${fieldCls} tracking-[0.5em]`} placeholder="•••••" value={pin} maxLength={5}
          inputMode="numeric" pattern="\d{4,5}" autoComplete="current-password"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required />
      </div>
      <div aria-live="polite" className="min-h-[1.5rem]">
        <ShakeError error={error} />
      </div>
      <Button type="submit" tone="cyan" size="md" disabled={loading} className="w-full">
        {loading ? 'Signing in…' : 'Log in'}
      </Button>
      <Button tone="ghost" size="md" disabled={loading} onClick={onBack} className="w-full !min-h-[48px]">← Back</Button>
    </form>
  );
}
