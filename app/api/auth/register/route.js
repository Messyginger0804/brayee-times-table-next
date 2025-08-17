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
    const res = NextResponse.json({ id: user.id, name: user.name, level: user.level, image: user.image });
    res.cookies.set('userId', String(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true,
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Name already taken' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

