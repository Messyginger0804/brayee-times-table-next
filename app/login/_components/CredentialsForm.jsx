"use client";
import Button from '../../../components/ui/Button';
import ShakeError from './ShakeError';

const fieldCls = 'w-full min-h-[3.25rem] rounded-chunk border-2 border-white/20 bg-space-900/80 px-4 text-lead text-ink placeholder:text-ink-dim/80 focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';

export default function CredentialsForm({ name, pin, setName, setPin, error, loading, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 border-t border-white/10 pt-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1 block text-body font-bold">Your name</label>
        <input id="name" className={fieldCls} placeholder="Type your name" value={name} autoComplete="username"
          onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="pin" className="mb-1 block text-body font-bold">4-digit PIN</label>
        <input id="pin" className={`${fieldCls} tracking-[0.5em]`} placeholder="••••" value={pin} maxLength={4}
          inputMode="numeric" pattern="\d{4}" autoComplete="current-password"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required />
      </div>
      <div aria-live="polite" className="min-h-[1.5rem]">
        <ShakeError error={error} />
      </div>
      <Button type="submit" tone="cyan" size="md" disabled={loading} className="w-full">
        {loading ? 'Signing in…' : 'Log in'}
      </Button>
    </form>
  );
}
