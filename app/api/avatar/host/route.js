import { avatarSize, readAvatarMap, hasKey, avatarResponse, fallbackFaceResponse } from '../../../../lib/avatarFile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public (no session) photo of the app's "host", configured in private/avatars.json as `"host": "<Name>"`
// (a key of the same map) or a size map / path. The private file wins when present (Docker); otherwise
// (Vercel, fresh checkout) we redirect to Braylee's committed photo in public/braylee/.
// Takes nothing but `size` from the request.
async function privateHost(size) {
  try {
    const map = await readAvatarMap();
    if (!hasKey(map, 'host')) return null;
    let entry = map.host;
    if (typeof entry === 'string' && hasKey(map, entry) && entry !== 'host') entry = map[entry];
    return await avatarResponse(entry, size, 'public');
  } catch (_) {
    return null;
  }
}

export async function GET(req) {
  const size = avatarSize(req);
  return (await privateHost(size)) || fallbackFaceResponse(req, size);
}
