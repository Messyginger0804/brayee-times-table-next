import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireUserId } from '../../_utils';

export const dynamic = 'force-dynamic';

// PUT { grade: 1-6 } - the signed-in kid sets their own grade. Only ever touches the caller's row.
export async function PUT(req) {
  const uid = await requireUserId();
  if (uid instanceof NextResponse) return uid;
  const body = await req.json().catch(() => ({}));
  const grade = Number(body?.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    return NextResponse.json({ error: 'grade must be 1-6' }, { status: 400 });
  }
  const user = await prisma.user.update({ where: { id: uid }, data: { grade }, select: { grade: true } });
  return NextResponse.json({ grade: user.grade });
}
