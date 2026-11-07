import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getUserId } from '../_utils';
import { avatarSize, readAvatarMap, hasKey, avatarResponse } from '../../../lib/avatarFile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serves ONLY the logged-in user's own mapped photo (private/avatars.json). Never takes a name or id from the request.
export async function GET(req) {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const size = avatarSize(req);
  const notFound = () => new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { name: true, savedCadet: true } });
    if (!user || user.savedCadet) return notFound(); // saved cadets pick their own nickname: never look it up in the photo map
    const map = await readAvatarMap();
    if (!hasKey(map, user.name)) return notFound();
    return (await avatarResponse(map[user.name], size, 'private')) || notFound();
  } catch (_) {
    return notFound();
  }
}
