import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { getUserId } from '../../../../_utils';

export async function GET(_req, { params }) {
  const userId = getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const level = parseInt(params.level, 10);
  if (![1,2].includes(level)) return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  try {
    const problems = await prisma.problem.findMany();
    const levelProblems = problems.filter(p => {
      const [aStr, bStr] = p.problem.split(' x ');
      const a = parseInt(aStr, 10), b = parseInt(bStr, 10);
      if (level === 1) return a <= 5 && b <= 5; return true;
    });
    const ids = levelProblems.map(p => p.id);
    const done = await prisma.userProblem.findMany({ where: { userId, problemId: { in: ids }, everCorrect: true }, select: { problemId: true } });
    const doneSet = new Set(done.map(d => d.problemId));
    const correctCount = doneSet.size; const total = ids.length;
    return NextResponse.json({ level, total, correctCount, allCorrect: correctCount === total });
  } catch (_) {
    return NextResponse.json({ error: 'Failed to fetch level status' }, { status: 500 });
  }
}

