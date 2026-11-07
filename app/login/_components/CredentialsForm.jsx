"use client";
import Button from '../../../components/ui/Button';
import SecretInput from '../../../components/ui/SecretInput';
import { STUDENT_ID_MAX, STUDENT_ID_PATTERN } from '../../../lib/cadetNames';
import ShakeError from './ShakeError';

const fieldCls = 'w-full min-h-[3.25rem] rounded-chunk border-2 border-white/20 bg-space-900/80 px-4 text-lead text-ink placeholder:text-ink-dim/80 focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';

export default function CredentialsForm({ name, setName, pin, setPin, error, loading, onSubmit, onBack }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off" data-form-type="other" noValidate>
      <div>
        <label htmlFor="cadet-name" className="mb-1 block text-body font-bold">Your name</label>
        <input id="cadet-name" name="cadet_nickname" type="text" className={fieldCls} value={name} maxLength={16} autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
          data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" autoFocus onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="student-id" className="block text-body font-bold">Student ID</label>
        <p id="student-id-help" className="mb-1 text-left text-body text-ink-dim">The number you use for lunch at school.</p>
        <SecretInput id="student-id" name="student_number" className={`${fieldCls} tracking-[0.5em]`} placeholder="•••••" value={pin} maxLength={STUDENT_ID_MAX}
          pattern={STUDENT_ID_PATTERN} describedBy="student-id-help" onChange={setPin} required />
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
