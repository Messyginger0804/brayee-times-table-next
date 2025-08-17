import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../_utils';

export async function GET() {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ id: user.id, name: user.name, level: user.level, image: user.image });
}

