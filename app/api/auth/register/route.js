import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, pin } = body || {};
  if (!name || !name.trim() || !pin || !/^\d{4}$/.test(String(pin))) {
    return NextResponse.json({ error: 'Name and a 4-digit PIN are required' }, { status: 400 });
  }
  try {
    const user = await prisma.user.create({ data: { name, pin } });
    return NextResponse.json({ id: user.id, name: user.name, level: user.level, image: user.image });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Name already taken' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

