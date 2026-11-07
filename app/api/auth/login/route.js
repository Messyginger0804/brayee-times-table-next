import { NextResponse } from 'next/server';
import { verifyPin } from '../../../../lib/pinAuth';
import { expireLegacyDeviceCookie } from '../../../../lib/legacyCookies';
import { clientIp } from '../../../../lib/rateLimit';
import { currentUserImage } from '../../../../lib/userImage';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, pin } = body || {};
  if (!name || !String(name).trim() || !pin) {
    return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 });
  }
  const r = await verifyPin(name, pin, { ip: clientIp(req.headers) });
  if (!r.ok) {
    const headers = r.retryAfter ? { 'Retry-After': String(r.retryAfter) } : undefined;
    return NextResponse.json({ error: r.error, retryAfter: r.retryAfter, maintenance: r.maintenance }, { status: r.status === 400 ? 401 : r.status, headers });
  }
  const user = r.user;
  return expireLegacyDeviceCookie(NextResponse.json({ id: user.id, name: user.name, level: user.level, image: currentUserImage(user.image) }));
}
