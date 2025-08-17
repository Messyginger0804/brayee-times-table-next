import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getUserId } from '../../../_utils';

export async function GET() {
  const userId = getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  try {
    const rows = await prisma.userProblem.findMany({
      where: { userId, everCorrect: true },
      select: { problemId: true },
    });
    return NextResponse.json({ problemIds: rows.map(r => r.problemId) });
  } catch (_) {
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

