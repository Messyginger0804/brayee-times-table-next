import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';

export async function POST(req) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { score } = await req.json().catch(() => ({}));
  if (typeof score !== 'number') return NextResponse.json({ error: 'Score required' }, { status: 400 });
  await prisma.test.create({ data: { userId, score } });
  return NextResponse.json({ success: true });
}

