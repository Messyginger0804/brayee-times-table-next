# Local dev, testing and change workflow

Details: [../../README.md](../../README.md), [../DEVELOPMENT.md](../DEVELOPMENT.md), [../TESTING.md](../TESTING.md).

## Working rule: production has a real user
A child uses the production app. Test every change on a branch with the local Docker stack. Never run tests, scripts, seeds or migrations that write to the production database, and never point a local process at it. Schema or data changes are rehearsed locally first and applied to production only by the owner, following [../DEPLOY-RUNBOOK.md](../DEPLOY-RUNBOOK.md).

## Local setup
- The Prisma CLI does not read `.env.docker`: for `prisma migrate` or the seed against the docker database, export `DATABASE_URL` (host `localhost`, port `55436`) in your shell or put it in `.env`.
- `npm install` (runs `prisma generate` on postinstall, no DB needed).
- Create `.env.docker` (gitignored) from `env.example`. Needed: `DATABASE_URL`, `NEXTAUTH_SECRET`. Optional: `SEED_BRAYLEE_PIN` (exactly 7 digits).
- `docker compose up -d --build` starts Postgres and the production-build app. The container entrypoint (`docker-entrypoint.sh`) runs `prisma migrate deploy` and the idempotent seed, then starts the app.
- `npm run dev:local` (`scripts/dev-local.sh`) runs hot reload against the docker Postgres, loading `.env.docker`.
- Ports: app container 3200, dev server 3300, Postgres 55436 on localhost.
- `docker compose down -v` wipes the local database volume; plain `down` keeps it.

## Environment variable names
Core: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Seeding: `SEED_BRAYLEE_PIN`. Tuning: `GUEST_SEATS`, `GUEST_MIN_IDLE_MINUTES`, `SAVED_CADETS_MAX`, `SAVED_CADET_RETENTION_DAYS`. Production: `CRON_SECRET`. Platform-set: `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`. Tooling: `TEST_DATABASE_URL`, `CHROME`, `PIN_REHASH`. Every variable is explained in `env.example`.

## Commands
`npm run lint`, `npm test` (Vitest; needs a Node version in jsdom 31's declared range, `^22.22.2 || ^24.15.0 || >=26.0.0`), `npm run test:coverage`, `npm run build`. Owner scripts: `db:set-student-id`, `db:cleanup-accounts`, `db:import-spelling`.

## Tests
- Under `tests/` (api, lib, curriculum, component tests with jsdom). API tests mock Prisma; see `tests/api/helpers.js`.
- `*.pg.test.js` files need a local migrated Postgres via `TEST_DATABASE_URL` and are skipped when unset. Those tests write rows and run `purgeInactiveSaved`, which deletes every expired saved cadet and their progress, including rows the tests did not create, so the URL must point at a separate, disposable local database, never one holding data you want to keep. The tests also read the first `Problem` row, and migrations insert none: on a migrated database run `npm run db:seed` (with `DATABASE_URL` set to that database) after `npm run db:migrate`. The Compose entrypoint seeds only the Compose database. `DATABASE_URL` must have the same value as `TEST_DATABASE_URL`, otherwise the persisted mission-unlock tests are skipped.
- Bcrypt-heavy sign-in tests have extended timeouts for slow CI runners.

## Conventions
- Relative imports, no `@/` aliases. Comments explain why. No emoji in docs.
- Commit and PR messages must not mention coding agents.
- Add a Prisma migration for any schema change; keep migration timestamps increasing and never use `db push`.
