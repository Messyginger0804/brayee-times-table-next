import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';
import { isSchemaMissing, maintenanceResponse } from '../../../../lib/dbErrors';
import { GUEST_COOKIE, guestCookieOptions, hashToken, seatLabel } from '../../../../lib/guests';
import { currentUserImage } from '../../../../lib/userImage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  let user;
  try { user = await prisma.user.findUnique({ where: { id } }); } catch (e) { if (isSchemaMissing(e)) return maintenanceResponse(); throw e; }
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.isGuest) {
    // Guests are anonymous: name is just the seat number ("Cadet 003" in the UI), no photo, nothing personal.
    const res = NextResponse.json({ id: user.id, name: seatLabel(user.guestSeat), level: user.level, image: null, isGuest: true, seat: user.guestSeat, grade: user.grade });
    // Slide the resume cookie while the kid keeps playing, but only if this device's cookie really is this seat's secret.
    const token = cookies().get(GUEST_COOKIE)?.value;
    if (token && user.guestTokenHash && hashToken(token) === user.guestTokenHash) res.cookies.set(GUEST_COOKIE, token, guestCookieOptions);
    return res;
  }
  return NextResponse.json({ id: user.id, name: user.name, level: user.level, image: currentUserImage(user.image), isGuest: false, grade: user.grade });
}
