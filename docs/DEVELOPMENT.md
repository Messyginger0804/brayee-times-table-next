# Development guide

For what the app does see the [README](../README.md); for how it fits together see [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- Node 20 or newer to run the app (the Dockerfile builds on Node 20; CI runs Node 24). The component tests need Node 22.22.2 or newer (jsdom 31 `engines`). There is no `.nvmrc`.
- npm (the lockfile is `package-lock.json`).
- Docker with the compose plugin, for the local Postgres.
- Run `npm install` once. It runs `prisma generate` via `postinstall`; no database is needed for that.

## Env files

Every variable is documented in [env.example](../env.example). All `.env*` files are gitignored; only `env.example` is tracked.

| File | Loaded by | Use |
|---|---|---|
| `.env.docker` | `docker compose` (the `app` service `env_file`) and `npm run dev:local` (the script `source`s it) | The main local config. `DATABASE_URL` host is `db`, the compose service name |
| `.env.local` | Next.js (`npm run dev`, `npm start`, `npm run build`) | Optional alternative for plain `next dev` on port 3000 |
| `.env` | Next.js and the Prisma CLI (`prisma migrate`, `prisma db seed`) | Prisma commands run from your shell read this |

Things to know:

- `npm run dev:local` rewrites `@db:5432` in `DATABASE_URL` to `@localhost:55436` and sets `NEXTAUTH_URL=http://localhost:3300`. It also exports every other variable in `.env.docker` to the dev server.
- The Prisma CLI does not read `.env.docker`. For `prisma migrate` or the seed against the docker database, export `DATABASE_URL` in your shell (host `localhost`, port `55436`) or put it in `.env`.
- Minimum to run: `DATABASE_URL` and `NEXTAUTH_SECRET`. Everything else is optional locally.
- Never point any of these at the production database. Local work uses only the docker Postgres.

## Local Postgres and the app

```sh
docker compose up -d --build   # db on localhost:55436, app (production build) on http://localhost:3200
npm run dev:local              # optional: dev server with hot reload on http://localhost:3300
```

- The compose database is Postgres 16 with user `braylee`, database `braylee`, volume `braylee_pgdata`. The credentials are throwaway local values defined in `docker-compose.yml`.
- On start, the app container runs `prisma migrate deploy` then `prisma db seed` (`docker-entrypoint.sh`), so a fresh volume is migrated and seeded automatically. `dev:local` does not migrate; start the compose stack at least once first, or run the migrations yourself.
- The `app` service mounts `./private` read-only for avatar photos. See [private.example/README.md](../private.example/README.md). Without it the UI falls back to the emoji astronaut or the committed photo.
- `docker compose down` stops the stack. `docker compose down -v` also deletes the database volume.
- `/gifs` (below) is dev-only, so it 404s on port 3200 (production build).

## Migrations

Schema changes are made in `prisma/schema.prisma` and captured as SQL migrations in `prisma/migrations/`.

1. Edit `prisma/schema.prisma`.
2. With `DATABASE_URL` pointing at the local docker database: `npm run prisma:migrate -- --name short_description` (that is `prisma migrate dev`). Commit the generated folder.
3. Keep migrations additive: new nullable or defaulted columns, new tables, new indexes. No drops, renames or type changes in the same release as the code that needs them. Production runs the old code until the new code is merged, so the old code must keep working on the migrated schema.
4. If running code depends on the new tables or columns, add them to `NEW_TABLES` / `NEW_QUALIFIED_COLUMNS` in `lib/dbErrors.js` so a not-yet-migrated database shows the maintenance message instead of a crash.
5. Never edit an applied migration. `20250817_init` in particular must stay byte-identical.
6. `npm run db:migrate` (`prisma migrate deploy`) applies checked-in migrations without creating new ones. Never use `prisma db push`.

Production migrations are manual and run before the merge; they are not applied by the deploy. See [OPERATIONS.md](OPERATIONS.md) and [DEPLOY-RUNBOOK.md](DEPLOY-RUNBOOK.md).

## Seeding

`npm run db:seed` runs `prisma/seed.js`, which is idempotent:

- Creates the 144 times-table `Problem` rows (1-12 x 1-12) if the table is empty.
- Creates the user `Braylee` if she does not exist (`prisma/seed-users.js`). An existing user is never changed, so re-running cannot overwrite a student ID.

Braylee's initial student ID comes from `SEED_BRAYLEE_PIN`:

- Set it to 5 to 8 digits to choose the ID (sign-in only accepts 5-8 digits). Any other non-empty value makes the seed fail; an empty value counts as unset.
- Leave it unset to get a random ID, printed once to the seed's output (for the compose stack: `docker compose logs app`) only when the user row is created. If you miss it, reset the database volume or run `npm run db:set-student-id -- --name Braylee` (hidden prompt; the script refuses a non-localhost database without `--i-have-a-backup`).
- No student ID is stored in source. Do not put a real one in a committed file, issue or PR.
- Student IDs are hashed with a pepper derived from `NEXTAUTH_SECRET`; tests set a dummy secret in `vitest.config.mjs`. Old-format hashes are only upgraded on sign-in in production (`VERCEL_ENV=production`) or with `PIN_REHASH=1`.

Spelling words are loaded separately: `DATABASE_URL=... npm run db:import-spelling` (add `-- --dry-run` first). It only inserts new words and fills empty fields.

Guest seats (`Guest 001`, ...) are created on demand by the app, not by the seed. Saved cadets are created by a guest through `POST /api/cadets/save`; `SAVED_CADETS_MAX` and `SAVED_CADET_RETENTION_DAYS` tune them. Validation rules (nickname, 5-8 digit student ID) live in `lib/cadetNames.js`; use `STUDENT_ID_MIN`/`STUDENT_ID_MAX` instead of hard-coding the length.

## Restoring a production dump locally

Privacy warning: a production dump contains real users' data, including children's progress and student-ID hashes. Keep it only in `.backups/` (gitignored), never commit, upload, paste or share it, and delete it when you are done. This repo is public.

The dump is Postgres 18 format, so restore with a postgres:18 client. Run from the repo root with the compose `db` service up:

```sh
docker compose up -d db
docker compose exec -T db psql -U braylee -d postgres -c 'drop database braylee with (force)' -c 'create database braylee'
docker run --rm --network host -v "$PWD/.backups:/d:ro" -e PGPASSWORD=braylee_local postgres:18 \
  pg_restore --no-owner --no-privileges -h localhost -p 55436 -U braylee -d braylee /d/prod.dump
export DATABASE_URL=postgresql://braylee:braylee_local@localhost:55436/braylee
npx prisma migrate resolve --applied 20260301000000_baseline_prod_schema
npm run db:migrate
npm run db:cleanup-accounts            # dry run; add -- --confirm to write
```

The `migrate resolve` step is needed because the dump's migration history predates the baseline migration. The cleanup script refuses non-localhost databases unless `--i-have-a-backup` is passed; do not pass it.

## Dev-only pages

| Route | Purpose |
|---|---|
| `/gifs` | Review page listing every GIF in `config/gifs.ts`, grouped by category. Returns 404 when `NODE_ENV=production` (`app/gifs/page.jsx`) |

## Checks before you push

```sh
npm run lint
npm test
npx tsc --noEmit
npm run build      # needs DATABASE_URL and NEXTAUTH_SECRET set to any value; it does not connect to a database
```

CI (`.github/workflows/ci.yml`) runs lint, tests with coverage, build, and fallow dead-code and duplication checks. See [TESTING.md](TESTING.md).

## Conventions observed in the repo

- Plain JS and JSX. No TypeScript except `config/gifs.ts`; `@/` aliases are not used, imports are relative.
- Pages under `app/` are thin; behavior lives in `components/*Mode.jsx` and hooks or pure helpers in `components/modes/` (`*Logic.js` for pure functions, `use*.js` for hooks). Pure logic gets unit tests.
- Every API route that touches the database exports `export const dynamic = 'force-dynamic'`.
- Auth in routes goes through `app/api/_utils.js` (`requireActor`, `requireUserId`, `requireProblemRequest`). Check for `instanceof NextResponse` on the result and return it. `requireProblemRequest(params)` instead returns `{ userId, actor, problemId }` or `{ error }`; return `error`.
- Every write keyed to a user goes through `guestSafe(actor, tx => ...)` from `lib/guestWrite.js`, so a guest whose seat was reassigned cannot write. If `w.lost` is set, return it.
- Validate input early and return `NextResponse.json({ error }, { status })` with 400 for bad input and 401 when not logged in.
- Routes that depend on newer migrations catch schema errors with `isSchemaMissing` / `maintenanceResponse` from `lib/dbErrors.js`.
- The in-memory rate limiter (`lib/rateLimit.js`) is best effort per server instance; the student-ID lockout in `lib/pinAuth.js` is the real protection.
- Comments explain why, not what, and are written in plain sentences. No emoji in docs; the UI itself uses emoji for kid-facing labels.
- Do not mention coding agents in commit or PR messages.
- Never call paid or metered model APIs from app code or tests. Voice uses the browser's speech engine only.

## How to add an API route

1. Create `app/api/<path>/route.js` and export handlers named `GET`, `POST`, `PUT`, and so on.
2. Add `export const dynamic = 'force-dynamic';` if it reads the database or the session.
3. Authenticate with `requireActor()` (or `requireUserId()` for read-only routes). Return early if the result is a `NextResponse`.
4. Parse the body with `await req.json().catch(() => ({}))`, validate, and return 400 on bad input.
5. Wrap writes in `guestSafe(actor, (tx) => ...)`.
6. Add the endpoint to [API.md](API.md).
7. Add a test in `tests/api/`: mock `lib/prisma` and `app/api/_utils`, and build requests with `jsonReq` / `getReq` from `tests/api/helpers.js`. `tests/api/simpleRoutes.test.js` is the template.

Logged-out page protection is separate: `middleware.js` only guards the pages listed in its `matcher`.

## How to add a game mode

Existing modes: Memorize, Practice and Testing live on the home page (`app/page.jsx`, `components/MemorizeMode.jsx`, `PracticeMode.jsx`, `TestingMode.jsx`); the Spelling Bee is its own route (`app/spelling-bee/page.jsx`, `components/SpellingBeeMode.jsx`); math missions render at `app/skill/[id]/page.jsx` via `components/SkillMode.jsx`.

1. Put the screen in `components/<Name>Mode.jsx`, composing `Header`, `Screen`, `GameHud` and `GateViews` as `SpellingBeeMode.jsx` does. Use `useAuthUser` and `useLoginRedirect` from `components/modes/shared/useAuthUser.js`, and `useSceneKind` for the backdrop.
2. Keep rules in a pure `components/modes/shared/<name>Logic.js` and state in a `use<Name>*.js` hook so they can be tested without rendering.
3. For a new route, add `app/<route>/page.jsx` (a client component rendering the mode). If logged-out visitors must be redirected, add the path to the `matcher` in `middleware.js`.
4. For a menu entry, add a tile to `MODE_TILES` in `components/modes/shared/HomeMenu.jsx` (`href` for a separate route, `mode` for an in-page mode).
5. Persist results through an API route (see above) and a model in `prisma/schema.prisma` with an additive migration if you need new storage.
6. Add tests next to the existing ones in `tests/` (pure logic in `*.test.js`, components in `*.test.jsx`).

## How to add a curriculum skill (math)

The math library is pure JS; the spec is the single source of truth. See [lib/curriculum/README.md](../lib/curriculum/README.md) for the problem shape, keypad flags and `promptParts`.

1. Add the skill object to the right grade in `docs/curriculum/math.json` (fields: `id`, `order`, `name`, `teks`, `ccss`, `description`, `season`, `generator`, `examples`, `mastery`, `levels`, `keypad`). The schema is described in [curriculum/math.md](curriculum/math.md).
2. Copy the file to `lib/curriculum/math/spec.json`. The two files are identical; keep them that way.
3. Add a generator in the matching `lib/curriculum/math/gen/*.js` file: `R['<skill-id>'] = (rng, { params, index, skill }) => ({ items, answer, ... })`, using the `build.js` helpers (`B`, `F`, `M`, `P`, `C`, `eq`).
4. Mission list, map and APIs pick the skill up automatically through `lib/mathSkills.js`. Only skills answered from the 12x12 `Problem` rows also need an entry in `lib/problemSkills.js`.
5. Run `npm test`. `tests/curriculum/` generates 200 problems per level with a fixed seed and checks each answer independently, so a new prompt format needs the oracle in `tests/curriculum/helpers.js` updated. Update the `79 skills, 254 levels` counts in the docs if they change.

Spelling words are data, not code: edit `docs/curriculum/spelling.json` and run `npm run db:import-spelling` (dry run first).
