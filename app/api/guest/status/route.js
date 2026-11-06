import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isSchemaMissing, maintenanceResponse } from '../../../../lib/dbErrors';
import { GUEST_COOKIE, findSeatByToken, seatLabel } from '../../../../lib/guests';

export const dynamic = 'force-dynamic';

// Does this device still own a guest seat? -> { resume: { seat, label } | null }. Purges idle seats first.
export async function GET() {
  const token = cookies().get(GUEST_COOKIE)?.value;
  let seat;
  try { seat = await findSeatByToken(token); } catch (e) { if (isSchemaMissing(e)) return maintenanceResponse(); throw e; }
  const res = NextResponse.json({ resume: seat ? { seat: seat.guestSeat, label: seatLabel(seat.guestSeat) } : null });
  if (token && !seat) res.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 }); // seat was wiped or taken over
  return res;
}
