import axios from 'axios';
import { signOut } from 'next-auth/react';

/** Expire the leftover cookies, end the NextAuth session, land on /login. The guest resume cookie is kept on purpose. */
export async function logout() {
  try { await axios.post('/api/auth/logout', {}, { withCredentials: true }); } catch (_) {}
  await signOut({ callbackUrl: '/login' });
}
