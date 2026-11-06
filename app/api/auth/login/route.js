import { NextResponse } from 'next/server';
import { verifyPin } from '../../../../lib/pinAuth';
import { cookieValue } from '../../../../lib/guests';
import { DEVICE_COOKIE, deviceCookieOptions, signDevice } from '../../../../lib/deviceTrust';
import { clientIp } from '../../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, pin } = body || {};
  if (!name || !String(name).trim() || !pin) {
    return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 });
  }
  const r = await verifyPin(name, pin, { ip: clientIp(req.headers), deviceToken: cookieValue(req.headers.get('cookie'), DEVICE_COOKIE) });
  if (!r.ok) {
    const headers = r.retryAfter ? { 'Retry-After': String(r.retryAfter) } : undefined;
    return NextResponse.json({ error: r.error, retryAfter: r.retryAfter, maintenance: r.maintenance }, { status: r.status === 400 ? 401 : r.status, headers });
  }
  const user = r.user;
  const res = NextResponse.json({ id: user.id, name: user.name, level: user.level, image: user.image });
  const dev = signDevice(user.id);
  if (dev) res.cookies.set(DEVICE_COOKIE, dev, deviceCookieOptions);
  return res;
}
