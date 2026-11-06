import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Logged-out visitors never see a game page: send them straight to /login before anything renders.
// Guest and Braylee sessions both carry a JWT with an id; /login itself is not matched, so no loops.
export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.id) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = { matcher: ['/', '/spelling-bee', '/skill/:path*'] };
