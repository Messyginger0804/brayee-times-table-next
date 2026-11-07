"use client";
import { useState } from 'react';
import axios from 'axios';
import Button from './ui/Button';

export const ordinal = (g) => ({ 1: '1st', 2: '2nd', 3: '3rd' }[g] || `${g}th`);

/** "What grade are you in?" 1st-6th. Saves with PUT /api/me/grade (the caller's own row), then calls onPicked(grade). */
export default function GradePicker({ current = null, onPicked }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const pick = async (g) => {
    setBusy(g);
    setError('');
    try {
      const r = await axios.put('/api/me/grade', { grade: g }, { withCredentials: true });
      onPicked?.(r.data?.grade ?? g);
    } catch (_) {
      setError('Hmm, that did not save. Try again!');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((g) => (
          <Button key={g} tone={current === g ? 'lime' : 'cyan'} size="lg" disabled={busy !== null}
            aria-pressed={current === g} onClick={() => pick(g)}>
            {ordinal(g)}
          </Button>
        ))}
      </div>
      <p role="alert" className="mt-3 min-h-[1.5rem] text-body font-bold text-neon-coral">{error}</p>
    </div>
  );
}
