"use client";
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { confirmSession } from '../../../lib/confirmSession';
import { queueCadetWelcome } from '../../../lib/cadetWelcome';

const SESSION_FAIL = 'Almost there, but the launch hiccuped. Please tap again!';
const GUEST_FAIL = 'Could not start a guest game. Try again!';

function validateLogin(name, pin) {
  if (!String(name).trim()) return 'Type your cadet name first.';
  if (!/^\d{4,5}$/.test(String(pin))) return 'Your secret number needs 4 or 5 numbers.';
  return '';
}

function loginFailMessage(res) {
  return res?.error && res.error !== 'CredentialsSignin' ? res.error : "That didn't work. Check your name and number, or try again in a little while.";
}

export default function useLogin() {
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

  // Navigate home only once /api/auth/me accepts the new session, so / never lands on a half-signed-in state.
  const finish = async (msg) => {
    const ok = await confirmSession(() => axios.get('/api/auth/me', { withCredentials: true, validateStatus: () => true }).then((r) => r.status));
    if (!ok) { setError(SESSION_FAIL); return false; }
    setDone(msg);
    setTimeout(() => router.replace('/'), 500);
    return true;
  };

  const enterGuest = async (mode) => {
    setError('');
    setLoading(true);
    try {
      const claim = await axios.post('/api/guest/claim', { mode }, { withCredentials: true });
      const res = await signIn('guest', { redirect: false });
      if (res?.ok) {
        queueCadetWelcome(window.sessionStorage, { label: claim.data?.label, kind: mode === 'resume' ? 'resume' : 'claim' });
        if (await finish('Blast off! 🚀')) return;
        setLoading(false);
        return;
      }
      setError(GUEST_FAIL);
    } catch (err) {
      setError(err?.response?.data?.error || GUEST_FAIL);
      if (mode === 'resume') setResume(null);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const invalid = validateLogin(name, pin);
    if (invalid) { setError(invalid); return; }
    setLoading(true);
    try {
      const res = await signIn('credentials', { name, pin, redirect: false });
      if (res?.ok) {
        setPin('');
        await fetch('/api/auth/link-cookie', { method: 'POST' }).catch(() => {});
        if (await finish('Welcome back! 🎉 Launching…')) return;
        setLoading(false);
        return;
      }
      setError(loginFailMessage(res));
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const openLogin = () => { setShowLogin(true); setError(''); };
  const closeLogin = () => { setShowLogin(false); setName(''); setPin(''); setError(''); };

  return { name, setName, pin, setPin, loading, showLogin, resume, error, done, enterGuest, handleLogin, openLogin, closeLogin };
}
