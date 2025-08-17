"use client";
import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

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
    const res = await signIn('credentials', { name, pin, redirect: false });
    if (res?.ok) {
      // Bridge NextAuth session to existing cookie-based APIs
      await fetch('/api/auth/link-cookie', { method: 'POST' });
      router.push('/');
    } else {
      Swal.fire({ icon: 'error', title: 'Login failed', text: res?.error || 'Invalid credentials', confirmButtonColor: '#a855f7' });
    }
    setLoading(false);
  };

  if (session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center p-4">
        <div className="p-6 bg-white bg-opacity-50 rounded-lg shadow-lg max-w-sm w-full text-center">
          <h1 className="text-3xl font-gochi-hand text-pink-500 mb-2">Welcome back! 💖</h1>
          <div className="mb-4">Signed in as <strong>{session.user.name || session.user.id}</strong></div>
          <button className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600" onClick={() => signOut({ callbackUrl: '/' })}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="p-6 bg-white bg-opacity-50 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h1 className="text-4xl font-gochi-hand text-pink-500 mb-4">Who’s playing? 💖</h1>
        <input className="border rounded px-3 py-2 w-full mb-3" placeholder="Type your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full mb-6" placeholder="Type your 4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} inputMode="numeric" pattern="\d{4}" required />
        <button disabled={loading} className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-gochi-hand text-2xl">{loading ? 'Signing in…' : 'Start Game 🚀'}</button>
      </form>
    </div>
  );
}
