import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { verifyPin } from './pinAuth';
import { clientIp } from './rateLimit';
import { isSchemaMissing, MAINTENANCE_MESSAGE } from './dbErrors';
import { GUEST_COOKIE, cookieValue, findSeatByToken, hashToken, touchGuest } from './guests';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        name: { label: 'Name', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials, req) {
        const r = await verifyPin(credentials?.name, credentials?.pin, { ip: clientIp(req?.headers) });
        if (!r.ok) {
          // surface the friendly cooldown message; everything else is a plain failed sign-in
          if (r.status === 429 || r.status === 503) throw new Error(r.error);
          return null;
        }
        const user = r.user;
        return { id: String(user.id), name: user.name, image: user.image, sc: !!user.savedCadet };
      },
    }),
    // Guest seat sign-in. No credentials are typed: the seat secret comes from the httpOnly cookie that
    // /api/guest/claim set on this device.
    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize(_credentials, req) {
        const h = req?.headers;
        const cookie = typeof h?.get === 'function' ? h.get('cookie') : h?.cookie;
        const token = cookieValue(cookie, GUEST_COOKIE);
        let seat;
        try { seat = await findSeatByToken(token); } catch (e) { if (isSchemaMissing(e)) throw new Error(MAINTENANCE_MESSAGE); throw e; }
        if (!seat) return null;
        await touchGuest(prisma, seat.id, new Date(), true);
        return { id: String(seat.id), name: seat.name, image: null, gk: hashToken(token) };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.gk = user.gk || null; // guest seat key; getUserId re-checks it so a rotated/wiped seat loses access
        token.sc = !!user.sc; // saved cadet: getUserId re-checks the row still exists (it is deleted after 30 idle days)
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id;
      if (token?.gk) session.user.gk = token.gk;
      if (token?.sc) session.user.sc = true;
      return session;
    },
  },
};
