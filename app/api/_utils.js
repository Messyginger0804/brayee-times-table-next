import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { NextResponse } from 'next/server';

export async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const id = parseInt(session.user.id, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function requireUserId() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  return id;
}