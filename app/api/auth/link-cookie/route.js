import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { DEVICE_COOKIE, deviceCookieOptions, signDevice } from '../../../../lib/deviceTrust';

export const dynamic = 'force-dynamic';

// The login page calls this right after a successful PIN sign-in. A real (non-guest) session proves the PIN was just
// entered correctly, so this is where the browser gets its trusted-device cookie (see lib/deviceTrust.js).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, id: session.user.id });
  const userId = parseInt(session.user.id, 10);
  if (!session.user.gk && Number.isInteger(userId)) {
    const dev = signDevice(userId);
    if (dev) res.cookies.set(DEVICE_COOKIE, dev, deviceCookieOptions);
  }
  return res;
}
