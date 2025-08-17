import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const best = await prisma.test.findFirst({ where: { userId }, orderBy: { score: 'desc' } });
  return NextResponse.json(best || null);
}

