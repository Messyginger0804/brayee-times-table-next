import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function POST(_req, { params }) {
  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await prisma.problem.update({ where: { id }, data: { mastered: true } });
  return NextResponse.json({ success: true });
}

