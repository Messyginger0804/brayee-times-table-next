# Data model and migrations

Full reference: [../DATA-MODEL.md](../DATA-MODEL.md). Schema: `prisma/schema.prisma`.

## Models
- Users and auth: `User` (Braylee, guest seats and saved cadets all live here; tracks lockout counters and `lastActiveAt`), `Account`, `Session`, `VerificationToken` (next-auth adapter tables).
- Times tables: `Problem` (facts), `UserProblem` (per-user mastery), `Attempt`.
- Math missions: `MathSkillProgress` (per-skill level and mastery windows), `MathAttempt`, `SkillUnlock` (earned mission unlocks, never removed except by seat wipe or saved-cadet purge).
- Spelling: `SpellingWord` (grouped by grade and unit), `SpellingAttempt`. Spelling results are not saved by the app yet (see known issues).
- `Test`: legacy table with unused routes.

## Migrations
Checked in under `prisma/migrations/`: init (2025), a baseline of the production schema, then grade and math progress, math unlocked by parent, guest seats, saved cadets, skill unlock. Rules:
- Create with `npm run prisma:migrate` against a local DB only; apply with `npm run db:migrate`. Never `db push`.
- Keep new migration folder timestamps strictly increasing.
- When code depends on a new table or column, add it to the lists in `lib/dbErrors.js` so deploys that land before the migration show maintenance instead of a 500.
- Seeds (`prisma/seed.js`, `prisma/seed-users.js`) are idempotent and never overwrite an existing user or student ID. The spelling word list is loaded by `npm run db:import-spelling` from `docs/curriculum/spelling.json`.

## Data lifecycle
Guest seats are wiped after 7 idle days. Saved cadets are deleted with all data after `SAVED_CADET_RETENTION_DAYS` idle days (default 30). Braylee is never purged. Purges run lazily and in the daily cron; logic in `lib/savedCadetPurge.js`.
