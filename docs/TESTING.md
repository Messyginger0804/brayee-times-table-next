# Testing

Related: [OPERATIONS.md](OPERATIONS.md), [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## Commands

| Task | Command |
|---|---|
| All tests, once | `npm test` (`vitest run`) |
| Tests with coverage | `npm run test:coverage` |
| One file | `npx vitest run tests/pinAuth.test.js` |
| Watch mode | `npx vitest` |
| Lint | `npm run lint` (`next lint`, config `.eslintrc.json` extends `next/core-web-vitals`) |
| Typecheck | `npx tsc --noEmit` (no npm script; `tsconfig.json` has `strict` but `checkJs: false`, so it checks `.ts`/`.tsx` only, mainly `config/`) |
| Production build | `npm run build` (needs `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` set to any dummy values; it does not connect to the DB) |

Tests do not need a database, a network or a running server, except the one gated Postgres test below.

## Vitest configuration

`vitest.config.mjs`:

- `esbuild.jsx = "automatic"` so `.jsx` components compile with the automatic runtime, as Next does.
- Default environment is `node`. Component tests opt in to jsdom per file with `// @vitest-environment jsdom` on the first line.
- Coverage uses the `v8` provider, reporters `json` and `text-summary`, output in `coverage/` (`coverage/coverage-final.json` is Istanbul format and is read by fallow in CI).
- Coverage `include` is `app/**`, `lib/**`, `components/**`, `scripts/**`; `exclude` covers tests, config files, `.next` and `coverage`.
- `all: false`: only files loaded by a test are reported. Do not turn it on; unloaded files get v8 entries with negative columns that make fallow reject the whole file. As a consequence the coverage percentage is not a measure of how much of the repo is tested.

## Layout

| Path | What is in it |
|---|---|
| `tests/*.test.js` | Library and logic tests: student-ID auth and lockout, saved cadets (`savedCadets`, `savedCadetGuard`, `cadetNames`, `setStudentIdGuards`), rate limiter, guests, cookies, drill attempts, auth logic, manifest, icons, security headers, `vercel.json`. |
| `tests/*.test.jsx` | jsdom component tests: modal focus trap and a11y (`uiA11y`), avatar and bubble components, voice settings focus. |
| `tests/api/*.test.js` | Route handler tests. Call the exported `GET`/`POST` directly with a `Request`. |
| `tests/api/helpers.js` | `jsonReq(body, url?, method?)` and `getReq(url?)` request builders. |
| `tests/lib/` | More `lib/` unit tests (auth, avatar, voice, skill state, problem skills, and so on). |
| `tests/curriculum/` | Curriculum generators, answer checking, mastery rules (`math.mastery.test.js`); `helpers.js` is shared. |
| `tests/guestWrite.pg.test.js`, `tests/savedCadets.pg.test.js` | Real-Postgres tests (guest write vs wipe; saving, retention purge and lockout of saved cadets). Gated, see below. |

## Which tests need Postgres

Two files: `tests/guestWrite.pg.test.js` and `tests/savedCadets.pg.test.js`. The first proves the `FOR SHARE` lock in `lib/guestWrite.js` and the row lock in `wipeSeat` exclude each other, which mocks cannot show. The second runs `saveCadet`, `purgeInactiveSaved` and `verifyPin` against real rows; its rows are named with the prefix `pgt-` and removed afterwards.

- Each is declared with `describe.skipIf(!url || !/localhost|127\.0\.0\.1/.test(url))`, where `url = process.env.TEST_DATABASE_URL`. So it runs only when `TEST_DATABASE_URL` is set **and** points at localhost or 127.0.0.1. A remote URL always skips; this is a safety guard so it never touches production.
- The database must already be migrated. The tests create and delete their own temporary rows.
- The file header also says `DATABASE_URL` should point at the same database.
- To run it locally: start the compose DB (`docker compose up -d db`), migrate it (`npm run db:migrate`), then run with both variables set to the local URL, for example `TEST_DATABASE_URL=<local url> DATABASE_URL=<local url> npx vitest run tests/guestWrite.pg.test.js tests/savedCadets.pg.test.js`. Never point these at the production database or at the docker `db` (port 55436) holding real data; use a separate throw-away local database. Use the credentials from your own `.env.docker`; do not paste real values into docs.
- CI has no Postgres service, so this test is skipped in CI (the normal run reports 2 skipped files). See [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

All other DB-touching tests mock `lib/prisma` (`vi.mock('../lib/prisma', ...)`).

## CI

`.github/workflows/ci.yml` runs on pull requests to `main` and pushes to `main`. Node 24, `npm ci`. Concurrent runs for the same ref are cancelled.

| Job | What it runs |
|---|---|
| `lint` | `npm run lint` |
| `test` | `npm run test:coverage`, then uploads `coverage/coverage-final.json` as an artifact (7 days) |
| `build` | `npm run build` with dummy `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`; caches `.next/cache` |
| `fallow-static` | pinned `fallow` (version set in the workflow `env`): `dead-code --fail-on-issues` and `dupes --threshold 2` |
| `fallow-audit` | needs `test`; on pull requests runs `fallow audit` against the base branch with coverage. CRAP scores are advisory and never fail the job. |

CI does not run the typecheck, any Postgres test, or any browser or end-to-end test. Fallow gates new complexity, dead code and duplication, so an unused export or file can fail a PR.

## Coverage

Run `npm run test:coverage` and read the text summary, or open `coverage/coverage-final.json`. Because of `all: false`, files with no test never appear. Known untested routes are listed in [KNOWN-ISSUES.md](KNOWN-ISSUES.md).

## Conventions for new tests

- Put the test next to its kind: route tests in `tests/api/`, library tests in `tests/` or `tests/lib/`, curriculum tests in `tests/curriculum/`. Name files `*.test.js` or `*.test.jsx`.
- Import `describe`, `it`, `expect`, `vi` from `vitest` explicitly (globals are not enabled).
- Route tests: mock `../../lib/prisma` and `../../app/api/_utils` (`getUserId`), build requests with `jsonReq` / `getReq`, and call the handler directly. Mock `next/headers` when the route reads cookies. See `tests/api/cronAndMe.test.js` and `tests/api/simpleRoutes.test.js` for working patterns.
- Every auth-gated route needs a 401 test (no session) and a happy-path test. Anything that deletes data needs a test of its auth gate (the purge cron is the model).
- Component tests: first line `// @vitest-environment jsdom`, render with `react-dom/client` inside `act`, and set `globalThis.IS_REACT_ACT_ENVIRONMENT = true` (see `tests/uiA11y.test.jsx`).
- Keep pure logic in plain functions (`*Logic.js`, `lib/`) so it can be tested without React or a database. Inject `db` and `now` parameters where the code already does (`lib/guests.js` does) instead of mocking globals.
- Time-dependent code: pass `now`, or use `vi.useFakeTimers()` and restore in `afterEach`.
- Tests that must hit a real database follow the `TEST_DATABASE_URL` + localhost `skipIf` pattern above, and clean up the rows they create.
- No test may call a paid or third-party API or a production system.
- Do not put real student IDs, names or secrets in fixtures. `vitest.config.mjs` sets `NEXTAUTH_SECRET=test-secret` because the student-ID pepper is derived from it.
