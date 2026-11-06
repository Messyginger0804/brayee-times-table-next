import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { purgeExpired } from '../../../../lib/guests';

export const dynamic = 'force-dynamic';

const safeEqual = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Daily Vercel cron (vercel.json). Vercel sends `Authorization: Bearer ${CRON_SECRET}`. Without CRON_SECRET set
// the endpoint refuses everyone. Wipes guest seats idle for more than 7 days.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const purged = await purgeExpired();
  return NextResponse.json({ purged });
}
