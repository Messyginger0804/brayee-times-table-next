import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function POST(req, { params }) {
  const id = parseInt(params.id, 10);
  const { correct } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid problem id' }, { status: 400 });
  const p = await prisma.problem.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.problem.update({
    where: { id },
    data: correct ? { correct: p.correct + 1 } : { incorrect: p.incorrect + 1 },
  });
  return NextResponse.json({ success: true });
}

