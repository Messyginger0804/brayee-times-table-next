import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  let problems = await prisma.problem.findMany();
  if (!problems || problems.length === 0) {
    const data = [];
    for (let i = 1; i <= 12; i++) {
      for (let j = 1; j <= 12; j++) {
        data.push({ problem: `${i} x ${j}`, answer: i * j });
      }
    }
    try {
      await prisma.problem.createMany({ data });
      problems = await prisma.problem.findMany();
    } catch (_) {}
  }
  return NextResponse.json(problems);
}

