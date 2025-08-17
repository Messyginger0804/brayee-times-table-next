import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getUserId } from '../../../_utils';

export async function POST(req, { params }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const problemId = parseInt(params.id, 10);
  if (!Number.isInteger(problemId)) return NextResponse.json({ error: 'Invalid problem id' }, { status: 400 });
  const { correct } = await req.json().catch(() => ({}));
  if (typeof correct !== 'boolean') return NextResponse.json({ error: 'Missing boolean `correct`' }, { status: 400 });
  try {
    await prisma.attempt.create({ data: { problemId, userId, isCorrect: !!correct } });
    const toDelete = await prisma.attempt.findMany({
      where: { problemId, userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      select: { id: true },
    });
    if (toDelete.length) {
      await prisma.attempt.deleteMany({ where: { id: { in: toDelete.map(a => a.id) } } });
    }
    await prisma.problem.update({
      where: { id: problemId },
      data: correct ? { correct: { increment: 1 } } : { incorrect: { increment: 1 } },
    });
    if (correct) {
      await prisma.userProblem.upsert({
        where: { userId_problemId: { userId, problemId } },
        update: { everCorrect: true },
        create: { userId, problemId, everCorrect: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 });
  }
}

