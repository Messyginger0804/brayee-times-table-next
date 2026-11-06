"use client";
import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Screen, { GlassCard } from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import HostAstronaut from '../../components/game/HostAstronaut';

const fieldCls = 'w-full min-h-[3.25rem] rounded-chunk border-2 border-white/20 bg-space-900/80 px-4 text-lead text-ink placeholder:text-ink-dim/80 focus:border-neon-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan/60';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [resume, setResume] = useState(null); // { seat, label } when this device still owns a guest seat
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    let alive = true;
    axios.get('/api/guest/status', { withCredentials: true })
      .then((r) => { if (alive) setResume(r.data?.resume || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const enterGuest = async (mode) => {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/guest/claim', { mode }, { withCredentials: true });
      const res = await signIn('guest', { redirect: false });
      if (res?.ok) {
        setDone('Blast off! 🚀');
        setTimeout(() => router.push('/'), 500);
        return;
      }
      setError('Could not start a guest game. Try again!');
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not start a guest game. Try again!');
      if (mode === 'resume') setResume(null);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please type your name.'); return; }
    if (!/^\d{4}$/.test(String(pin))) { setError('Your PIN needs exactly 4 numbers.'); return; }
    setLoading(true);
    try {
      const res = await signIn('credentials', { name, pin, redirect: false });
      if (res?.ok) {
        await fetch('/api/auth/link-cookie', { method: 'POST' });
        setDone('Welcome back! 🎉 Launching…');
        setTimeout(() => router.push('/'), 700);
        return;
      }
      setError(res?.error ? `Login failed: ${res.error}` : 'Hmm, that name or PIN did not work. Try again!');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  if (session?.user) {
    return (
      <Screen className="items-center justify-center">
        <GlassCard className="w-full max-w-sm text-center">
          <p className="mb-4 text-lead">You are already signed in 🚀</p>
          <div className="flex flex-col gap-3">
            <Button tone="cyan" size="lg" href="/">Go play</Button>
            <Button tone="ghost" onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</Button>
          </div>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen className="items-center justify-center">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-4 text-center">
          <HostAstronaut size={150} className="mb-3" />
          <h1 className="text-hero text-neon-cyan text-glow">Times Tables Mission Control</h1>
          <p className="mt-1 text-lead text-ink-dim">Ready for blast off?</p>
        </div>

        <GlassCard>
          <div className="flex flex-col gap-3">
            {resume ? (
              <>
                <Button tone="lime" size="lg" disabled={loading} onClick={() => enterGuest('resume')}
                  className="min-h-[5rem] w-full text-title">
                  🚀 Continue as Cadet {resume.label}
                </Button>
                <Button tone="ghost" disabled={loading} onClick={() => enterGuest('new')} className="w-full">
                  ✨ New guest
                </Button>
              </>
            ) : (
              <Button tone="lime" size="lg" disabled={loading} onClick={() => enterGuest('new')}
                className="min-h-[5rem] w-full text-title">
                🚀 Play as Guest
              </Button>
            )}

            <div aria-live="polite" className="min-h-[1.5rem] text-center">
              {error && !showLogin && (
                <motion.p role="alert" initial={{ x: 0 }} animate={{ x: [0, -6, 6, -4, 4, 0] }} transition={{ duration: 0.4 }}
                  className="text-body font-bold text-neon-coral">{error}</motion.p>
              )}
              {done && <p className="text-body font-bold text-neon-lime">{done}</p>}
            </div>

            {!showLogin ? (
              <button type="button" className="min-h-[3rem] text-body text-neon-cyan underline underline-offset-4"
                onClick={() => { setShowLogin(true); setError(''); }}>
                Log in
              </button>
            ) : (
              <form onSubmit={handleLogin} className="flex flex-col gap-4 border-t border-white/10 pt-4" noValidate>
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
                  {error && (
                    <motion.p role="alert" initial={{ x: 0 }} animate={{ x: [0, -6, 6, -4, 4, 0] }} transition={{ duration: 0.4 }}
                      className="text-body font-bold text-neon-coral">{error}</motion.p>
                  )}
                </div>
                <Button type="submit" tone="cyan" size="md" disabled={loading} className="w-full">
                  {loading ? 'Signing in…' : 'Log in'}
                </Button>
              </form>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </Screen>
  );
}
