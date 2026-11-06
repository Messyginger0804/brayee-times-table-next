"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';

/** Loads the signed-in user's details (level, image, name) once NextAuth reports a status. */
export function useAuthUser(authStatus) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (authStatus === 'authenticated') {
      axios.get('/api/auth/me', { withCredentials: true })
        .then((r) => setUser(r.data || null))
        .catch(() => setUser(null));
    } else if (authStatus === 'unauthenticated') {
      setUser(null);
    }
  }, [authStatus]);
  return [user, setUser];
}
