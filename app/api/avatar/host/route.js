import { NextResponse } from 'next/server';
import { avatarSize, readAvatarMap, hasKey, avatarResponse } from '../../../../lib/avatarFile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public (no session) photo of the app's "host", configured in private/avatars.json as `"host": "<Name>"`
// (a key of the same map) or a size map / path. Reads only from private/. Takes nothing but `size` from the request.
export async function GET(req) {
  const size = avatarSize(req);
  const notFound = () => new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
  try {
    const map = await readAvatarMap();
    if (!hasKey(map, 'host')) return notFound();
    let entry = map.host;
    if (typeof entry === 'string' && hasKey(map, entry) && entry !== 'host') entry = map[entry];
    return (await avatarResponse(entry, size, 'public')) || notFound();
  } catch (_) {
    return notFound();
  }
}
