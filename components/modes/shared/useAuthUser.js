"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import axios from 'axios';
import { confirmSession } from '../../../lib/confirmSession';
import { shouldSignOut } from './authLogic';

/** Loads the signed-in user's details (level, image, name) once NextAuth reports a status. */
export function useAuthUser(authStatus) {
  const [user, setUser] = useState(null);
  const [unreachable, setUnreachable] = useState(false); // server did not answer (not the same as signed out)
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setUnreachable(false); setAttempt((n) => n + 1); }, []);
  useEffect(() => {
    if (authStatus === 'unauthenticated') { setUser(null); return undefined; }
    if (authStatus !== 'authenticated') return undefined;
    let alive = true;
    const fetchMe = () => axios.get('/api/auth/me', { withCredentials: true, validateStatus: () => true });
    let last = 0; // last HTTP status seen; 0 means a network error
    confirmSession(async () => {
      try {
        const r = await fetchMe();
        last = r.status;
        if (r.status === 200 && alive) setUser(r.data || null);
        return r.status;
      } catch (e) { last = 0; throw e; }
    }).then((ok) => {
      if (!alive || ok) return;
      // A session /api/auth/me definitely rejects is cleared, which sends the visitor to /login.
      // A network error or 5xx is not that: keep the session and offer a retry.
      if (shouldSignOut(last)) { setUser(null); signOut({ redirect: false }); } else setUnreachable(true);
    });
    return () => { alive = false; };
  }, [authStatus, attempt]);
  return [user, setUser, { unreachable, retry }];
}

/** Fallback for the server redirect in middleware.js: once NextAuth says nobody is signed in, go to /login. */
export function useLoginRedirect(authStatus) {
  const router = useRouter();
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.replace('/login');
  }, [authStatus, router]);
}
