"use client";
import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import axios from 'axios';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Name required', confirmButtonColor: '#a855f7' });
      return;
    }
    if (!/^\d{4}$/.test(String(pin))) {
      Swal.fire({ icon: 'warning', title: 'PIN must be 4 digits', confirmButtonColor: '#a855f7' });
      return;
    }
    setLoading(true);
    try {
      if (isRegistering) {
        await axios.post('/api/auth/register', { name: name.trim(), pin }, { withCredentials: true });
        await Swal.fire({
          icon: 'success',
          title: 'Account created ✨',
          text: 'Signing you in…',
          showConfirmButton: false,
          timer: 1600,
          confirmButtonColor: '#a855f7',
          background: 'transparent',
        });
      }
      const res = await signIn('credentials', { name, pin, redirect: false });
      if (res?.ok) {
        await fetch('/api/auth/link-cookie', { method: 'POST' });
        try {
          await Swal.fire({
            icon: 'success',
            title: isRegistering ? 'Welcome! 🎉' : 'Welcome back! 🎉',
            text: 'Signed in successfully',
            showConfirmButton: false,
            timer: 1800,
            confirmButtonColor: '#a855f7',
            background: 'transparent',
          });
        } catch (_) {}
        router.push('/');
      } else {
        Swal.fire({ icon: 'error', title: isRegistering ? 'Signup failed' : 'Login failed', text: res?.error || 'Invalid credentials', confirmButtonColor: '#a855f7' });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || (isRegistering ? 'Could not create account' : 'Login failed');
      Swal.fire({ icon: 'error', title: 'Oops…', text: msg, confirmButtonColor: '#a855f7' });
    }
    setLoading(false);
  };

  if (session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center p-4">
        <div className="p-6 bg-white bg-opacity-50 rounded-lg shadow-lg max-w-sm w-full text-center">
          <h1 className="text-3xl font-gochi-hand text-pink-500 mb-2">Welcome back! 💖</h1>
          <div className="mb-4">Signed in as <strong>{session.user.name || session.user.id}</strong></div>
          <button
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            onClick={async () => {
              try {
                await Swal.fire({
                  icon: 'info',
                  title: 'Logging out…',
                  showConfirmButton: false,
                  timer: 1500,
                  confirmButtonColor: '#a855f7',
                  background: 'transparent',
                });
              } catch (_) {}
              await signOut({ callbackUrl: '/' });
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="p-6 bg-white bg-opacity-50 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h1 className="text-4xl font-gochi-hand text-pink-500 mb-1">{isRegistering ? 'Create an Account 🦄' : 'Who’s playing? 💖'}</h1>
        <p className="text-purple-700 mb-4">{isRegistering ? 'Pick a name and PIN you will remember.' : 'Type your name and PIN to continue.'}</p>
        <input className="border rounded px-3 py-2 w-full mb-3" placeholder="Type your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full mb-4" placeholder="Type your 4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} inputMode="numeric" pattern="\d{4}" required />
        <button disabled={loading} className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-gochi-hand text-2xl mb-3">
          {loading ? (isRegistering ? 'Creating…' : 'Signing in…') : (isRegistering ? 'Create Account ✨' : 'Start Game 🚀')}
        </button>
        <button type="button" className="text-sm text-purple-700 hover:underline" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Login' : 'Create a new account'}
        </button>
      </form>
    </div>
  );
}
