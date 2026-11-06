import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../../../lib/prisma';
import { getUserId } from '../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = path.join(process.cwd(), 'private');
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };

// Serves ONLY the logged-in user's own mapped photo (private/avatars.json). Never takes a name or id from the request.
export async function GET(req) {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const size = new URL(req.url).searchParams.get('size') === '160' ? '160' : '512';
  const notFound = () => new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
    if (!user) return notFound();
    const map = JSON.parse(await readFile(path.join(ROOT, 'avatars.json'), 'utf8'));
    if (!Object.prototype.hasOwnProperty.call(map, user.name)) return notFound();
    const entry = map[user.name];
    const rel = typeof entry === 'string' ? entry : entry?.[size] || entry?.['512'];
    if (typeof rel !== 'string') return notFound();
    const file = path.resolve(ROOT, rel);
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type || !file.startsWith(ROOT + path.sep)) return notFound();
    const data = await readFile(file);
    return new NextResponse(data, {
      status: 200,
      headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (_) {
    return notFound();
  }
}
