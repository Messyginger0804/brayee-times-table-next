"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import axios from 'axios';
import { confirmSession } from '../../../lib/confirmSession';

/** Loads the signed-in user's details (level, image, name) once NextAuth reports a status. */
export function useAuthUser(authStatus) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (authStatus === 'unauthenticated') { setUser(null); return undefined; }
    if (authStatus !== 'authenticated') return undefined;
    let alive = true;
    const fetchMe = () => axios.get('/api/auth/me', { withCredentials: true, validateStatus: () => true });
    confirmSession(async () => {
      const r = await fetchMe();
      if (r.status === 200 && alive) setUser(r.data || null);
      return r.status;
    }).then((ok) => {
      // Never leave a half-signed-in screen: a session that /api/auth/me will not accept is cleared, which sends the visitor to /login.
      if (!ok && alive) { setUser(null); signOut({ redirect: false }); }
    });
    return () => { alive = false; };
  }, [authStatus]);
  return [user, setUser];
}

/** Fallback for the server redirect in middleware.js: once NextAuth says nobody is signed in, go to /login. */
export function useLoginRedirect(authStatus) {
  const router = useRouter();
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/login');
  }, [authStatus, router]);
}
