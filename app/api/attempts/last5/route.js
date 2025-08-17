import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  try {
    const attempts = await prisma.attempt.findMany({
      where: { userId },
      orderBy: [ { problemId: 'asc' }, { createdAt: 'desc' } ],
      select: { id: true, problemId: true, isCorrect: true, createdAt: true },
    });
    const summaries = {};
    for (const a of attempts) {
      const key = String(a.problemId);
      if (!summaries[key]) summaries[key] = { attempts: [], correctCount: 0, totalCount: 0 };
      const s = summaries[key];
      if (s.attempts.length < 5) {
        s.attempts.push(a);
        s.totalCount++;
        if (a.isCorrect) s.correctCount++;
      }
    }
    return NextResponse.json({ summaries });
  } catch (_) {
    return NextResponse.json({ error: 'Failed to fetch attempt summaries' }, { status: 500 });
  }
}

