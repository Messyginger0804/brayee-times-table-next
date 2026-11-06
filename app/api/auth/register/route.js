import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Sign-ups are closed: Braylee has the only real account and everyone else plays as a guest (/api/guest/claim).
const gone = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
export const GET = gone;
export const POST = gone;
export const PUT = gone;
