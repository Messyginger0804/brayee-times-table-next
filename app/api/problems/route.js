import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { buildTimesTableProblems } from '../../../lib/timesTableProblems';

export const dynamic = 'force-dynamic';

export async function GET() {
  let problems = await prisma.problem.findMany();
  if (!problems || problems.length === 0) {
    try {
      await prisma.problem.createMany({ data: buildTimesTableProblems() });
      problems = await prisma.problem.findMany();
    } catch (_) {}
  }
  return NextResponse.json(problems);
}

