import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';
import { isSchemaMissing, maintenanceResponse } from '../../../../lib/dbErrors';
import { seatLabel } from '../../../../lib/guests';

export const dynamic = 'force-dynamic';

export async function GET() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  let user;
  try { user = await prisma.user.findUnique({ where: { id } }); } catch (e) { if (isSchemaMissing(e)) return maintenanceResponse(); throw e; }
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.isGuest) {
    // Guests are anonymous: name is just the seat number ("Cadet 003" in the UI), no photo, nothing personal.
    return NextResponse.json({ id: user.id, name: seatLabel(user.guestSeat), level: user.level, image: null, isGuest: true, seat: user.guestSeat, grade: user.grade });
  }
  return NextResponse.json({ id: user.id, name: user.name, level: user.level, image: user.image, isGuest: false, isSaved: !!user.savedCadet, grade: user.grade });
}
