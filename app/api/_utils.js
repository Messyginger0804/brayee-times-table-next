import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { NextResponse } from 'next/server';
import { validateGuestSession } from '../../lib/guests';

/** The signed-in caller as { id, gk }: gk is the guest seat key (null for real accounts). Null when not signed in or the seat is gone. */
async function getActor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const id = parseInt(session.user.id, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  // Guest sessions carry the seat key. Every guest request lazily purges idle seats, checks the seat still belongs to
  // this device (not rotated/wiped), and refreshes lastActiveAt (throttled).
  if (session.user.gk && !(await validateGuestSession(id, session.user.gk))) return null;
  return { id, gk: session.user.gk || null };
}

export async function getUserId() {
  return (await getActor())?.id ?? null;
}

/** Like requireUserId but returns the actor { id, gk } for lib/guestWrite.js. */
export async function requireActor() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  return actor;
}

export async function requireUserId() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  return id;
}

/** Auth + `[id]` param check shared by the /api/problems/[id]/* routes. Returns { userId, actor, problemId } or { error: Response }. */
export async function requireProblemRequest(params) {
  const actor = await getActor();
  if (!actor) return { error: NextResponse.json({ error: 'Not logged in' }, { status: 401 }) };
  const problemId = parseInt(params.id, 10);
  if (!Number.isInteger(problemId)) return { error: NextResponse.json({ error: 'Invalid problem id' }, { status: 400 }) };
  return { userId: actor.id, actor, problemId };
}
