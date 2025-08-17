import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, pin } = body || {};
  if (!name || !name.trim() || !pin) {
    return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { name } });
  if (!user || user.pin !== pin) {
    return NextResponse.json({ error: 'Invalid name or PIN' }, { status: 401 });
  }
  return NextResponse.json({ id: user.id, name: user.name, level: user.level, image: user.image });
}

