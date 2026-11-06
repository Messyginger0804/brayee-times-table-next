import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GUEST_COOKIE, claimSeat, findSeatByToken, guestCookieOptions, releaseByToken, seatLabel } from '../../../../lib/guests';

export const dynamic = 'force-dynamic';

// POST { mode: 'resume' | 'new' }
// Sets the httpOnly seat cookie on this device; the client then calls signIn('guest') to start the session.
//  - resume: keep this device's seat (409 if it no longer has one)
//  - new: give up this device's old seat (if any, it is wiped) and take a free or longest-idle seat
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'resume' ? 'resume' : 'new';
  const existing = cookies().get(GUEST_COOKIE)?.value;

  if (mode === 'resume') {
    const seat = await findSeatByToken(existing);
    if (!seat) {
      const res = NextResponse.json({ error: 'No guest seat on this device' }, { status: 409 });
      if (existing) res.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 });
      return res;
    }
    const res = NextResponse.json({ seat: seat.guestSeat, label: seatLabel(seat.guestSeat) });
    res.cookies.set(GUEST_COOKIE, existing, guestCookieOptions); // slide the 7 days
    return res;
  }

  if (existing) await releaseByToken(existing);
  const { user, token } = await claimSeat();
  const res = NextResponse.json({ seat: user.guestSeat, label: seatLabel(user.guestSeat) });
  res.cookies.set(GUEST_COOKIE, token, guestCookieOptions);
  return res;
}
