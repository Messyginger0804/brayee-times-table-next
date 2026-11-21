# Error log

Entries go newest first.

## 503 "The game is getting an upgrade" (maintenance: true)
- Cause: code deployed before the database migrations it depends on (Prisma P2021, P2022 or P2010).
- Fix: apply the pending migrations with `npm run db:migrate` per the deploy runbook; add new tables and columns to `lib/dbErrors.js` so the response stays friendly.
- Date: 2026-11-07

## Cron endpoint returns 401
- Cause: `CRON_SECRET` unset or mismatched.
- Fix: set `CRON_SECRET` in the hosting project and redeploy.
- Date: 2026-11-07
