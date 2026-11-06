"use client";
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const GUEST_FAIL = 'Could not start a guest game. Try again!';

function validateCredentials(name, pin) {
  if (!name.trim()) return 'Please type your name.';
  if (!/^\d{4}$/.test(String(pin))) return 'Your PIN needs exactly 4 numbers.';
  return '';
}

function loginFailMessage(res) {
  return res?.error ? `Login failed: ${res.error}` : 'Hmm, that name or PIN did not work. Try again!';
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

  const finish = (msg, delay) => {
    setDone(msg);
    setTimeout(() => router.push('/'), delay);
  };

  const enterGuest = async (mode) => {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/guest/claim', { mode }, { withCredentials: true });
      const res = await signIn('guest', { redirect: false });
      if (res?.ok) { finish('Blast off! 🚀', 500); return; }
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
    const invalid = validateCredentials(name, pin);
    if (invalid) { setError(invalid); return; }
    setLoading(true);
    try {
      const res = await signIn('credentials', { name, pin, redirect: false });
      if (res?.ok) {
        await fetch('/api/auth/link-cookie', { method: 'POST' });
        finish('Welcome back! 🎉 Launching…', 700);
        return;
      }
      setError(loginFailMessage(res));
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const openLogin = () => { setShowLogin(true); setError(''); };

  return { name, pin, setName, setPin, loading, showLogin, resume, error, done, enterGuest, handleLogin, openLogin };
}
