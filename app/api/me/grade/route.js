import { NextResponse } from 'next/server';
import { guestSafe } from '../../../../lib/guestWrite';
import { requireActor } from '../../_utils';

export const dynamic = 'force-dynamic';

// PUT { grade: 1-6 } - the signed-in kid sets their own grade. Only ever touches the caller's row.
export async function PUT(req) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const body = await req.json().catch(() => ({}));
  const grade = Number(body?.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    return NextResponse.json({ error: 'grade must be 1-6' }, { status: 400 });
  }
  const w = await guestSafe(actor, (tx) => tx.user.update({ where: { id: actor.id }, data: { grade }, select: { grade: true } }));
  if (w.lost) return w.lost;
  return NextResponse.json({ grade: w.value.grade });
}
