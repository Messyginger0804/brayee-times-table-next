import { NextResponse } from 'next/server';
import { expireLegacyDeviceCookie } from '../../../../lib/legacyCookies';

export async function POST() {
  return expireLegacyDeviceCookie(NextResponse.json({ success: true }));
}
