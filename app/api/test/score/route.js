import { NextResponse } from 'next/server';
import { guestSafe } from '../../../../lib/guestWrite';
import { requireActor } from '../../_utils';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { score } = await req.json().catch(() => ({}));
  if (typeof score !== 'number') return NextResponse.json({ error: 'Score required' }, { status: 400 });
  const w = await guestSafe(actor, (tx) => tx.test.create({ data: { userId: actor.id, score } }));
  if (w.lost) return w.lost;
  return NextResponse.json({ success: true });
}

