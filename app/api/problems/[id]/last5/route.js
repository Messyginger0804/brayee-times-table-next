import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireProblemRequest } from '../../../_utils';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { userId, problemId, error } = await requireProblemRequest(params);
  if (error) return error;
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

