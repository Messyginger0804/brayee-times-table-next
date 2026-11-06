import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { NextResponse } from 'next/server';
import { validateGuestSession } from '../../lib/guests';

export async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const id = parseInt(session.user.id, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  // Guest sessions carry the seat key. Every guest request lazily purges idle seats, checks the seat still belongs to
  // this device (not rotated/wiped), and refreshes lastActiveAt (throttled).
  if (session.user.gk && !(await validateGuestSession(id, session.user.gk))) return null;
  return id;
}

export async function requireUserId() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  return id;
}
