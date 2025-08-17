import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export function getUserId() {
  const cookieStore = cookies();
  const raw = cookieStore.get('userId')?.value || '';
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function requireUserId() {
  const id = getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  return id;
}

