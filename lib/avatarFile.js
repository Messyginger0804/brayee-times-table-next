import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const ROOT = path.join(process.cwd(), 'private');
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };

/** Avatar size from the request URL: only '160' or '512' (default) are ever honored. */
export const avatarSize = (req) => (new URL(req.url).searchParams.get('size') === '160' ? '160' : '512');

/** Reads private/avatars.json. Throws if missing/invalid (callers return their own 404). */
export async function readAvatarMap() {
  return JSON.parse(await readFile(path.join(ROOT, 'avatars.json'), 'utf8'));
}

export const hasKey = (map, k) => Object.prototype.hasOwnProperty.call(map, k);

/**
 * Serves one avatars.json entry (a path string or a { 160, 512 } map) as an image, confined to private/.
 * `visibility` is the Cache-Control scope: 'private' for per-user photos, 'public' for the shared host photo.
 * Returns null when the entry resolves to nothing servable (caller answers 404).
 */
export async function avatarResponse(entry, size, visibility) {
  const rel = typeof entry === 'string' ? entry : entry?.[size] || entry?.['512'];
  if (typeof rel !== 'string') return null;
  const file = path.resolve(ROOT, rel);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type || !file.startsWith(ROOT + path.sep)) return null;
  const data = await readFile(file);
  return new NextResponse(data, {
    status: 200,
    headers: { 'Content-Type': type, 'Cache-Control': `${visibility}, max-age=3600`, 'X-Content-Type-Options': 'nosniff' },
  });
}

/**
 * Fallback host face when private/ has none (Vercel): redirects to the committed, pre-cropped photo in
 * public/braylee/ (built by scripts/build-braylee-face.mjs). `size` is already whitelisted by avatarSize.
 */
export const fallbackFaceResponse = (req, size) =>
  new NextResponse(null, {
    status: 307,
    headers: { Location: new URL(`/braylee/face-${size}.webp`, req.url).toString(), 'Cache-Control': 'public, max-age=3600' },
  });
