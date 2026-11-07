import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireActor } from '../../_utils';
import { clientIp, hit } from '../../../../lib/rateLimit';
import { isSchemaMissing, maintenanceResponse } from '../../../../lib/dbErrors';
import { validateNickname, validateSecret } from '../../../../lib/cadetNames';
import { SavedCadetError, saveCadet } from '../../../../lib/savedCadets';
import { GUEST_COOKIE } from '../../../../lib/guests';

export const dynamic = 'force-dynamic';

// POST { name, secret, confirm } - a signed-in GUEST turns their seat into a saved cadet (progress is kept).
// `secret` is the 5-digit student ID: it is hashed in lib/savedCadets.js and never stored, logged or returned. Answers { ok, name } only.
// The client then signs in with the new name + ID, because the guest session's seat key no longer exists.
const SAVE_LIMIT = 10; // per IP per window, per server instance (best effort)
const SAVE_WINDOW_MS = 10 * 60 * 1000;
const STATUS = { full: 409, taken: 409, seat: 401 };

const fail = (error, status, extra) => NextResponse.json({ error, ...extra }, { status });

export async function POST(req) {
  try {
    return await handle(req);
  } catch (e) {
    if (isSchemaMissing(e)) return maintenanceResponse();
    if (e instanceof SavedCadetError) return fail(e.message, STATUS[e.code] ?? 400, { code: e.code });
    throw e;
  }
}

async function handle(req) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (!actor.gk) return fail('Only guest cadets can be saved.', 403);

  const rl = hit(`save:${clientIp(req.headers)}`, SAVE_LIMIT, SAVE_WINDOW_MS);
  if (!rl.ok) return NextResponse.json({ error: 'Whoa, slow down! Try again in a few minutes. 🚀' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

  const body = await req.json().catch(() => ({}));
  const nick = validateNickname(body?.name);
  if (!nick.ok) return fail(nick.error, 400, { code: 'name' });
  const secret = validateSecret(body?.secret, body?.confirm);
  if (!secret.ok) return fail(secret.error, 400, { code: 'secret' });

  const saved = await saveCadet(prisma, actor, nick.name, String(body.secret));
  const res = NextResponse.json({ ok: true, name: saved.name });
  res.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 }); // the seat token is dead: this device no longer "resumes" a guest seat
  return res;
}
