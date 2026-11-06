import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clientIp, hit } from '../../../../lib/rateLimit';
import { isSchemaMissing, maintenanceResponse } from '../../../../lib/dbErrors';
import { GUEST_COOKIE, SeatsBusyError, claimSeat, findSeatByToken, guestCookieOptions, releaseDeviceSeat, seatLabel } from '../../../../lib/guests';

export const dynamic = 'force-dynamic';

// POST { mode: 'resume' | 'new' }
// Sets the httpOnly seat cookie on this device; the client then calls signIn('guest') to start the session.
//  - resume: keep this device's seat (409 if it no longer has one)
//  - new: give up this device's old seat (if any, it is wiped) and take a free or longest-idle seat
const CLAIM_LIMIT = 10; // per IP per window, per server instance (best effort)
const CLAIM_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req) {
  try {
    return await handle(req);
  } catch (e) {
    if (isSchemaMissing(e)) return maintenanceResponse();
    if (e instanceof SeatsBusyError) {
      return NextResponse.json({ error: e.message, busy: true }, { status: 503, headers: { 'Retry-After': '300' } });
    }
    throw e;
  }
}

async function handle(req) {
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

  const rl = hit(`claim:${clientIp(req.headers)}`, CLAIM_LIMIT, CLAIM_WINDOW_MS); // new seats only; resuming is cheap
  if (!rl.ok) {
    return NextResponse.json({ error: 'Whoa, slow down! Try again in a few minutes. 🚀' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  if (existing && !(await releaseDeviceSeat(existing))) {
    // the old seat is still held by this device: claim nothing, so the device can never hold two
    return NextResponse.json({ error: 'Hmm, that did not work. Try again in a moment! 🚀' }, { status: 503, headers: { 'Retry-After': '5' } });
  }
  const { user, token } = await claimSeat();
  const res = NextResponse.json({ seat: user.guestSeat, label: seatLabel(user.guestSeat) });
  res.cookies.set(GUEST_COOKIE, token, guestCookieOptions);
  return res;
}
