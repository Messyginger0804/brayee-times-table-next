"use client";
import { useState } from 'react';
import axios from 'axios';
import { signIn } from 'next-auth/react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import SecretInput from './ui/SecretInput';
import { NAME_MAX, STUDENT_ID_MAX, STUDENT_ID_PATTERN, validateNickname, validateSecret } from '../lib/cadetNames';

const FIELD = 'w-full min-h-[3.25rem] rounded-chunk border-2 border-white/20 bg-space-900/80 px-4 text-lead text-ink placeholder:text-ink-dim/80 focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';
const FORM_ID = 'save-cadet-form';

function Field({ id, label, children }) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="mb-1 block text-body font-bold text-ink">{label}</label>
      {children}
    </div>
  );
}

/** Nickname + student ID (twice). The ID only lives in this component's state and the request body; it is cleared as soon as we are done. */
function SaveForm({ form, setForm, error, onSubmit }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const idProps = { maxLength: STUDENT_ID_MAX, pattern: STUDENT_ID_PATTERN, placeholder: '•••••', className: `${FIELD} tracking-[0.5em]` };
  return (
    <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-3" autoComplete="off" data-form-type="other" noValidate>
      <Field id="cadet-name" label="Pick a cadet name">
        <input id="cadet-name" name="cadet_nickname" type="text" className={FIELD} value={form.name} maxLength={NAME_MAX} autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
          data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other" onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field id="cadet-secret" label="Your student ID (we scramble it so nobody can read it)">
        <SecretInput id="cadet-secret" name="student_number" {...idProps} value={form.secret} onChange={(v) => set('secret', v)} />
      </Field>
      <Field id="cadet-confirm" label="Type your student ID again">
        <SecretInput id="cadet-confirm" name="student_number_again" {...idProps} value={form.confirm} onChange={(v) => set('confirm', v)} />
      </Field>
      <p className="text-left text-body">Use your student ID (the number you use for lunch at school). We keep it secret and never show it to anyone. Don&apos;t share it with friends!</p>
      <div aria-live="polite" className="min-h-[1.5rem]">
        {error ? <p role="alert" className="text-body font-bold text-neon-coral">{error}</p> : null}
      </div>
    </form>
  );
}

const EMPTY = { name: '', secret: '', confirm: '' };

/** "Save my cadet" (guests only): turns this guest seat into a named cadet, keeps the progress, then signs in as that cadet. */
export default function SaveCadet() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => { if (busy) return; setOpen(false); setForm(EMPTY); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const bad = [validateNickname(form.name), validateSecret(form.secret, form.confirm)].find((r) => !r.ok);
    if (bad) { setError(bad.error); return; }
    setError('');
    setBusy(true);
    try {
      const saved = await axios.post('/api/cadets/save', form, { withCredentials: true });
      const res = await signIn('credentials', { name: saved.data.name, pin: form.secret, redirect: false });
      setForm(EMPTY);
      window.location.assign(res?.ok ? '/' : '/login'); // full reload: the old guest session is gone
    } catch (err) {
      setError(err?.response?.data?.error || 'Hmm, that did not work. Try again in a moment! 🚀');
      setBusy(false);
    }
  };

  return (
    <>
      <Button tone="violet" disabled={busy} onClick={() => setOpen(true)}>
        <span aria-hidden="true">💾</span> Save my cadet
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Save my cadet 💾"
        actions={(
          <>
            <Button type="submit" form={FORM_ID} tone="lime" size="lg" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            <Button tone="ghost" className="!min-h-[48px]" disabled={busy} onClick={close}>Not now</Button>
          </>
        )}
      >
        <SaveForm form={form} setForm={setForm} error={error} onSubmit={submit} />
      </Modal>
    </>
  );
}
