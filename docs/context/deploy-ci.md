# Deploy, CI and operations

Authoritative runbooks: [../OPERATIONS.md](../OPERATIONS.md) and [../DEPLOY-RUNBOOK.md](../DEPLOY-RUNBOOK.md). Read those before any release.

## CI
`.github/workflows/ci.yml` runs on pull requests to main and on pushes to main, using Node 24. Jobs: lint (`npm run lint`), test (`npm run test:coverage`, uploads the coverage JSON), build (`npm run build` with dummy env values, no DB), and fallow dead-code and duplication checks (pinned version, uses the coverage artifact). CI has no Postgres, so `*.pg.test.js` files are skipped there.

## Deploy
- The hosting platform deploys from `main`. `vercel.json` has an `ignoreCommand` that skips builds for any other branch, so a pushed branch gets no preview build.
- `vercel.json` also schedules the daily guest purge (`/api/cron/purge-guests`), which requires `CRON_SECRET`; without it the endpoint answers 401.
- Migrations do not run on deploy. They are applied by the owner with `npm run db:migrate` (`prisma migrate deploy`) per the runbook, ideally before the code that needs them. Code that is ahead of the database answers 503 with a maintenance message (`lib/dbErrors.js`).
- Local Docker image: `Dockerfile` plus `docker-compose.yml`, for local use only.

## Release order (summary)
1. Branch, change, test locally with Docker.
2. Owner takes a backup and applies required backward-compatible migrations before merging (merging to main starts the deploy). Use a staged release for incompatible migrations (see the runbook).
3. Merge to main after CI passes, then the owner confirms the deploy.

## Operational limits to remember
- Rate limits are in memory, per instance. Lockout tiers: 5 wrong IDs = 1 minute up to 24 hours at 25 or more.
- Changing `NEXTAUTH_SECRET` signs everyone out and invalidates every stored student ID, because the hash pepper derives from it.
- Preview or local processes must not rewrite stored hashes; the legacy-hash upgrade only runs when `VERCEL_ENV` is production or `PIN_REHASH` is set.
- Open problems and accepted risks: [../KNOWN-ISSUES.md](../KNOWN-ISSUES.md).
