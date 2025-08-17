import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';

export async function POST(req) {
  const userId = getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const next = parseInt(body?.level, 10);
  if (!Number.isInteger(next) || next < 1 || next > 2) {
    return NextResponse.json({ error: 'Level must be 1 or 2' }, { status: 400 });
  }
  try {
    if (next === 2) {
      const problems = await prisma.problem.findMany();
      const level1Ids = problems.filter(p => {
        const [aStr, bStr] = p.problem.split(' x ');
        const a = parseInt(aStr, 10), b = parseInt(bStr, 10);
        return a <= 5 && b <= 5;
      }).map(p => p.id);
      const done = await prisma.userProblem.findMany({
        where: { userId, problemId: { in: level1Ids }, everCorrect: true },
        select: { problemId: true },
      });
      if (done.length !== level1Ids.length) {
        return NextResponse.json({ error: 'Complete all Level 1 problems in practice before unlocking Level 2' }, { status: 400 });
      }
    }
    const updated = await prisma.user.update({ where: { id: userId }, data: { level: next } });
    return NextResponse.json({ id: updated.id, name: updated.name, level: updated.level, image: updated.image });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update level' }, { status: 500 });
  }
}

