# App architecture and layout

Next.js 14 App Router, plain JS/JSX, Prisma 5 on PostgreSQL, next-auth 4 with JWT sessions. Full prose is in [../ARCHITECTURE.md](../ARCHITECTURE.md); this is the map.

## Entry points
- `app/layout.jsx`, `app/providers.jsx`, `app/template.jsx`: shell, session and GIF providers.
- `app/page.jsx` (home), `app/spelling-bee/page.jsx`, `app/skill/[id]/page.jsx`, `app/login/page.jsx`. Pages are thin; behavior lives in components and hooks.
- `middleware.js` redirects visitors with no JWT to `/login`. Matcher covers only `/`, `/spelling-bee`, `/skill/*`. API routes do their own auth.
- `app/gifs/page.jsx` is a dev-only page, hidden when `NODE_ENV` is production.

## Where code lives
- `app/api/**/route.js`: HTTP endpoints (list in [../API.md](../API.md)). Shared auth helpers in `app/api/_utils.js` (`requireActor`, `requireUserId`, `requireProblemRequest`).
- `components/*Mode.jsx`: the game modes (Memorize, Practice, Testing, Skill, SpellingBee). Their logic is split into `components/modes/drill/` and `components/modes/shared/` (`*Logic.js` pure functions, `use*.js` hooks).
- `components/game/`, `components/space/`, `components/braylee/`, `components/ui/`: presentational pieces (keypad, 3D backdrop, mascot, buttons).
- `lib/`: server and shared logic. `lib/pinAuth.js` (student-ID hashing and lockout), `lib/auth.js` (next-auth options), `lib/guests.js` and `lib/guestWrite.js` (guest seats), `lib/savedCadets.js` and `lib/savedCadetPurge.js`, `lib/skillState.js` (unlock rule), `lib/rateLimit.js`, `lib/dbErrors.js`, `lib/prisma.js`.
- `lib/curriculum/math/`: problem generators, checker and mastery rules for 79 skills; API in `lib/curriculum/README.md`. `lib/curriculum/math/spec.json` must stay identical to `docs/curriculum/math.json`.
- `config/`: Braylee voice lines and clip manifest, GIF list.
- `prisma/`: schema, migrations, seed scripts. `scripts/`: owner maintenance scripts and asset builders.

## Identity model
Three kinds of player: Braylee (student ID sign-in, escalating lockout), guest seats (cookie-based, seats numbered, wiped after 7 idle days), saved cadets (a guest who keeps progress under a nickname plus student ID, purged after 30 idle days by default). Student IDs are exactly 7 digits and are HMAC-peppered using a key derived from `NEXTAUTH_SECRET`.

## Rules worth knowing
- Guest-session writes keyed to a user go through `guestSafe` in `lib/guestWrite.js`, so a seat that was reassigned cannot write. Exception: `recordSuccess` in `lib/pinAuth.js` (sign-in bookkeeping) updates the user directly by ID.
- DB-touching API routes export `dynamic = 'force-dynamic'`. Exception: the NextAuth route `app/api/auth/[...nextauth]/route.js` does not, although credentials sign-in writes to the database (via `verifyPin` and `recordSuccess`).
- Routes that depend on newer migrations opt in to `maintenanceResponse` (503 with `maintenance: true`) from `lib/dbErrors.js`. Add new tables and columns to the lists there when a migration adds something code needs.
- The in-memory rate limiter is per server instance and best effort; the lockout in `lib/pinAuth.js` is the real protection.
- Speech uses the browser engine plus pre-generated clips; no paid or metered APIs in app code or tests.
