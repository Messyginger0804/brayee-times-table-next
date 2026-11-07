# Braylee's Space Academy

A math and spelling practice game for one child, Braylee, built by her father. She signs in with a 4-digit PIN; anyone else plays as an anonymous guest seat (no sign-ups, no personal data). Math missions cover grades 1-6 plus the 12x12 times tables; the Spelling Bee reads words aloud. The code and metadata may still say "Braylee's Space Academy" on branches that predate the rename.

## Features

- Times tables (1-12 x 1-12) in three modes: Memorize, Practice, Testing. Testing unlocks after every fact in her current set has been practiced (level 1 uses only the 1-5 tables).
- Math missions: 79 skills across grades 1-6, 254 levels, generated problems with a purpose-built keypad (fractions, decimals, remainders, comparisons, yes/no). A mission map shows the next skill.
- Spelling Bee with words stored in the database, grouped by grade and unit.
- Progress tracking: per-fact mastery, per-skill level and mastery windows, last-5 summaries, best test score.
- Two kinds of player: Braylee (PIN login with escalating lockout) and guest seats (cookie-based, wiped after 7 idle days).
- Spoken cheers and instructions using the browser's built-in speech engine, with optional pre-generated clips for Braylee's lines. No paid APIs.
- Animated feedback (GIF cards, fireworks, 3D space backdrop), installable as a PWA.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, plain JS/JSX (one TypeScript file: `config/gifs.ts`) |
| Auth | next-auth 4 with JWT sessions, `bcryptjs` PIN hashes |
| Database | PostgreSQL 16 via Prisma 5 |
| UI | Tailwind CSS 3, framer-motion, three.js with react-three-fiber |
| Tests | Vitest (jsdom for components) |
| CI | GitHub Actions: lint, test with coverage, build, fallow dead-code and duplication checks |
| Hosting | Vercel (cron for guest cleanup); Docker image for local use |

## Quick start

Prerequisites: Node 20 or newer to run the app (the Dockerfile uses 20, CI uses 24); `npm test` needs Node 22.22.2 or newer because jsdom 31 requires it, npm, Docker with the compose plugin. Details are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

1. Install dependencies: `npm install`
2. Create `.env.docker` (gitignored) from [env.example](env.example). At minimum `DATABASE_URL` (host `db`, port 5432, user `braylee`, database `braylee`, password as in `docker-compose.yml`) and `NEXTAUTH_SECRET`. Optionally `SEED_BRAYLEE_PIN` (4 digits).
3. Start Postgres and the production-build app: `docker compose up -d --build`. The app container applies migrations and seeds on start.
4. Optional, for hot reload: `npm run dev:local`.

| Service | URL / port |
|---|---|
| Docker app (production build) | http://localhost:3200 |
| Dev server (`npm run dev:local`) | http://localhost:3300 |
| Postgres (docker `db`) | localhost:55436 |

Stop the stack with `docker compose down`. Add `-v` only to wipe the database volume.

If you did not set `SEED_BRAYLEE_PIN`, the seed prints a random PIN once, in the app container log, when it first creates the Braylee user (`docker compose logs app`). Guests need no PIN: use "Play as Guest".

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | `next dev` on port 3000, using `.env` / `.env.local` |
| `npm run dev:local` | Dev server on port 3300 against the docker Postgres, loading `.env.docker` |
| `npm run build` | `prisma generate && next build` |
| `npm start` | `next start -p 3000` |
| `npm run lint` | `next lint` |
| `npm test` | `vitest run` |
| `npm run test:coverage` | Vitest with v8 coverage (writes `coverage/coverage-final.json`) |
| `npm run prisma:generate` | `prisma generate` (also runs on `postinstall`) |
| `npm run prisma:migrate` | `prisma migrate dev` (create and apply a migration on a local DB) |
| `npm run prisma:seed` | `node prisma/seed.js` |
| `npm run db:migrate` | `prisma migrate deploy` (apply checked-in migrations) |
| `npm run db:seed` | `prisma db seed` |
| `npm run db:import-spelling` | Idempotent import of `docs/curriculum/spelling.json` into `SpellingWord`; supports `--dry-run` |
| `npm run db:cleanup-accounts` | One-time account merge/cleanup; dry run unless `--confirm` is passed |

Type check (not an npm script): `npx tsc --noEmit`.

## Project structure

| Path | Contents |
|---|---|
| `app/` | App Router pages (`/`, `/login`, `/spelling-bee`, `/skill/[id]`, dev-only `/gifs`), `layout.jsx`, manifest and share images |
| `app/api/` | Route handlers; shared auth helpers in `app/api/_utils.js` |
| `components/` | UI. `modes/` holds mode logic and hooks, `game/` the question card and keypads, `ui/` base widgets, `braylee/`, `gif/`, `space/` visuals |
| `lib/` | Server and shared logic: auth, guest seats, PIN lockout, rate limit, mastery, voice, Prisma client |
| `lib/curriculum/math/` | Pure-JS problem generators, answer checking and mastery rules; see [lib/curriculum/README.md](lib/curriculum/README.md) |
| `config/` | GIF catalog, cheer lines, voice clip list |
| `prisma/` | `schema.prisma`, `migrations/`, seed scripts |
| `scripts/` | Dev server launcher, spelling import, account cleanup, icon and image builders |
| `tests/` | Vitest suites; API route tests use `tests/api/helpers.js` |
| `docs/` | Project documentation and curriculum research |
| `public/` | Static assets (Braylee cutouts, icons, GIFs, audio clips) |
| `private.example/` | Template for gitignored `private/` avatar photos |
| `middleware.js` | Redirects logged-out visitors from game pages to `/login` |
| `vercel.json`, `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh` | Deploy and local-stack config |

## Documentation

| Page | Contents |
|---|---|
| [docs/README.md](docs/README.md) | Index of all documentation |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, env files, migrations, seeding, conventions, how to extend |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the system fits together |
| [docs/API.md](docs/API.md) | HTTP endpoints |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Database tables and relationships |
| [docs/GAMEPLAY.md](docs/GAMEPLAY.md) | Modes, levels, mastery and unlock rules |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Running and maintaining production |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy and how to run tests |
| [docs/KNOWN-ISSUES.md](docs/KNOWN-ISSUES.md) | Known problems and limitations |
| [docs/DEPLOY-RUNBOOK.md](docs/DEPLOY-RUNBOOK.md) | Production migration and deploy steps |
| [docs/curriculum/math.md](docs/curriculum/math.md), [spelling.md](docs/curriculum/spelling.md) | Curriculum research (JSON twins sit beside them) |
| [lib/curriculum/README.md](lib/curriculum/README.md) | Math problem library API |

## Privacy

The repository is public. Real PINs, env values, database dumps and avatar photos must never be committed (`.env*`, `private/`, `.backups/` and `*.dump` are gitignored).
