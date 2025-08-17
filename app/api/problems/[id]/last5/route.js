import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getUserId } from '../../../_utils';

export async function GET(_req, { params }) {
  const userId = getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const problemId = parseInt(params.id, 10);
  if (!Number.isInteger(problemId)) return NextResponse.json({ error: 'Invalid problem id' }, { status: 400 });
  try {
    const attempts = await prisma.attempt.findMany({
      where: { problemId, userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const correctCount = attempts.filter(a => a.isCorrect).length;
    return NextResponse.json({ correctCount, totalCount: attempts.length, attempts });
  } catch (_) {
    return NextResponse.json({ error: 'Failed to fetch last 5' }, { status: 500 });
  }
}

