import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = path.join(process.cwd(), 'private');
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };

// Public (no session) photo of the app's "host", configured in private/avatars.json as `"host": "<Name>"`
// (a key of the same map) or a size map / path. Reads only from private/. Takes nothing but `size` from the request.
export async function GET(req) {
  const size = new URL(req.url).searchParams.get('size') === '160' ? '160' : '512';
  const notFound = () => new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
  try {
    const map = JSON.parse(await readFile(path.join(ROOT, 'avatars.json'), 'utf8'));
    const has = (k) => Object.prototype.hasOwnProperty.call(map, k);
    if (!has('host')) return notFound();
    let entry = map.host;
    if (typeof entry === 'string' && has(entry) && entry !== 'host') entry = map[entry];
    const rel = typeof entry === 'string' ? entry : entry?.[size] || entry?.['512'];
    if (typeof rel !== 'string') return notFound();
    const file = path.resolve(ROOT, rel);
    const type = TYPES[path.extname(file).toLowerCase()];
    if (!type || !file.startsWith(ROOT + path.sep)) return notFound();
    const data = await readFile(file);
    return new NextResponse(data, {
      status: 200,
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (_) {
    return notFound();
  }
}
