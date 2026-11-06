import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { expireLegacyDeviceCookie } from '../../../../lib/legacyCookies';

export const dynamic = 'force-dynamic';

// The login page calls this right after a sign-in. It only confirms the session and expires any leftover
// "trusted device" cookie from the removed feature; it does not set anything.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return expireLegacyDeviceCookie(NextResponse.json({ ok: true, id: session.user.id }));
}
