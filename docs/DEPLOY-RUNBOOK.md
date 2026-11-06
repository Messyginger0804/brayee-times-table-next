> WARNING: merging `ui-overhaul` into `main` auto-deploys to production through Vercel's git integration. The runbook below (backup, migrate, cleanup) must be done as part of that merge, never before checking it.

# Production deploy runbook: adopting the migration history

Status: rehearsed on a local restore of the prod dump (`prodsim` database in the local docker db). NOT yet run against prod.

## Why this is needed

Prod's schema is ahead of the old repo. Prod's `_prisma_migrations` lists three finished migrations:

| migration | in repo? |
|---|---|
| `20250817_init` | yes, byte-identical (checksum `3724b899...205c` matches) - never edit it |
| `20260129173431_add_login_security` | no (source lost) |
| `20260129174704_add_user_mastery` | no (source lost) |

`prisma/migrations/20260301000000_baseline_prod_schema` is the catch-up: `init` + this migration = prod's exact schema (User.email/emailVerified/failedLoginAttempts/lockedUntil/isAdmin, UserProblem.mastered, Account, Session, VerificationToken, SpellingWord, SpellingAttempt). Prod already has all of that, so on prod it must be marked applied, never executed. Fresh databases run it normally.

The two lost migrations stay in prod's table untouched; Prisma only warns that they are missing locally (rehearsal confirmed `migrate deploy` still succeeds).

## Steps (prod)

Use a shell where `DATABASE_URL` points at prod. Do this from a machine with the repo at the deploy commit.

1. Backup (custom format, restorable):
   `pg_dump -Fc "$DATABASE_URL" -f braylee-prod-$(date +%Y%m%d-%H%M).dump`
   Check it: `pg_restore -l <file> | head` and keep a copy off the box.
2. Record row counts (save the output):
   `psql "$DATABASE_URL" -Atc "select 'User',count(*) from \"User\" union all select 'UserProblem',count(*) from \"UserProblem\" union all select 'Attempt',count(*) from \"Attempt\" union all select 'SpellingWord',count(*) from \"SpellingWord\""`
3. Confirm schema already matches (expect `-- This is an empty migration.`):
   `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`
   If this prints SQL, STOP: prod drifted from the repo schema. Do not continue.
4. Adopt the baseline (writes one row to `_prisma_migrations`, changes no data):
   `npx prisma migrate resolve --applied 20260301000000_baseline_prod_schema`
5. `npx prisma migrate deploy` (expect "No pending migrations to apply").
6. Verify:
   - `npx prisma migrate status` -> "Database schema is up to date!"
   - repeat the step 3 diff (empty) and step 2 counts (identical; `_prisma_migrations` is +1).
   - Deploy the app, then smoke test: log in with a hashed-PIN user, `/api/auth/me` returns `isAdmin`, `/api/spelling/words` returns `"source":"db"`, a wrong PIN returns 401 and 5 wrong gives a 60s cooldown.
7. Rollback:
   - Step 4 only added a row: undo with `delete from _prisma_migrations where migration_name = '20260301000000_baseline_prod_schema';` (no schema change to undo).
   - App rollback: redeploy the previous build. The new schema is a no-op, so the old build keeps working. Note the old (lost) prod code is what hashes PINs; the repo's pre-overhaul code compares plaintext and would not log in hashed users.
   - Data restore (only if data was damaged): create a new database, `pg_restore --no-owner -d <new> <backup>`, repoint `DATABASE_URL`. Do not restore over the live DB.

## Deploy order: one real account + guest seats (current)

Account model: Braylee keeps the ONLY real account; everyone else plays as an anonymous guest seat (`lib/guests.js`). Guest data is wiped after 7 idle days. No sign-ups, no parent screens (`/parent`, `/api/parent/*` are gone; `isAdmin` and `unlockedByParent` stay in the schema, unused).

Migration `20260601000000_add_guest_seats` is purely additive: `User.isGuest` (default false), `guestSeat` (unique), `guestTokenHash` (unique), `lastActiveAt`. Generated like the previous ones (`prisma migrate diff --from-migrations ... --shadow-database-url <scratch db>`). Seat rows (`Guest 001`...) are created lazily by the app on first guest request.

New env vars (set in the host, never committed): `CRON_SECRET` (required for the daily purge; `Authorization: Bearer $CRON_SECRET`, see `vercel.json`; without it the cron endpoint refuses everyone) and optional `GUEST_SEATS` (default 5, clamped 1-100; lowering it leaves higher seats unreachable but they are still purged).

Steps, in order (shell with `DATABASE_URL` = prod, repo at the deploy commit). If prod has not adopted the baseline yet, do the "Steps (prod)" section above first (items 1-5) - this section assumes that is done or is run as part of it.

1. Backup: `pg_dump -Fc "$DATABASE_URL" -f braylee-prod-$(date +%Y%m%d-%H%M).dump`; check with `pg_restore -l`; keep an off-box copy. Record row counts (step 2 above).
2. `npx prisma migrate deploy` (applies the grade/math/unlock/guest migrations; expect "All migrations have been successfully applied").
3. Cleanup dry run (default, nothing written, always rolled back): `npm run db:cleanup-accounts`. Read the output: it must list `Braylee` as keep, `braylee, Bray, bray` as merge and everyone else as delete. Prod checkout needs the `--i-have-a-backup` flag because the host is not localhost: `npm run db:cleanup-accounts -- --i-have-a-backup`.
4. Confirm (one transaction, idempotent): `npm run db:cleanup-accounts -- --confirm --i-have-a-backup`. A second `--confirm` is a no-op ("merge: (none left)", "delete: 0 users").
5. Verify:
   - exactly one non-guest user: `select count(*) from "User" where not "isGuest"` -> 1 (`Braylee`).
   - Braylee's attempts = the sum of her four accounts' attempts from the dry run (rehearsal: 77 + 5 + 35 + 72 = 189).
   - `Problem` and `SpellingWord` counts unchanged vs. step 1 (rehearsal: 144 / 54, `Problem.correct/incorrect/mastered` global counters are not touched).
   - `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` -> `-- This is an empty migration.`; `npx prisma migrate status` up to date.
   - Deploy the app, then smoke test: `Braylee` + PIN logs in and shows the merged history and photo; "Play as Guest" gives Cadet 001; `POST /api/auth/register` -> 404; `/parent` -> 404; `/api/cron/purge-guests` without the bearer -> 401, with it -> `{"purged":0}`.
6. Rollback:
   - Cleanup deletes data: the ONLY undo is the step 1 backup. Restore into a NEW database (`createdb`, `pg_restore --no-owner -d <new> <backup>`), repoint `DATABASE_URL`; never restore over the live DB.
   - Schema: the guest columns are ignored by the previous build; to undo (only if needed) `ALTER TABLE "User" DROP COLUMN "isGuest", DROP COLUMN "guestSeat", DROP COLUMN "guestTokenHash", DROP COLUMN "lastActiveAt";` and `delete from _prisma_migrations where migration_name = '20260601000000_add_guest_seats';`.
   - App: redeploy the previous build (it still has the old parent screens; accounts deleted by the cleanup do not come back without the backup).

Cleanup rules (`scripts/cleanup-accounts.js`): exact, case-sensitive names (KEEP `Braylee`; MERGE `braylee`, `bray`, `Bray`); everything else non-guest is deleted with all of its data; guest seat rows are never touched. Attempt/Test/SpellingAttempt/MathAttempt rows are re-pointed. `UserProblem` conflicts: `everCorrect` OR, `updatedAt` latest, `mastered` recomputed by `lib/mastery.js` from the merged attempts (the table has no counters). `MathSkillProgress` conflicts: attempts/correct summed, highest `levelIndex`, mastered OR. Braylee's `level` becomes the highest of her accounts. Refuses a non-localhost `DATABASE_URL` without `--i-have-a-backup`.

Seed: `prisma/seed-users.js` now only ensures `Braylee` (it no longer creates Dad/Mom/test, which the container entrypoint would otherwise re-create on every start).

## Notes

- Legacy plaintext PINs: 10 of the 32 prod users (per the prod dump) still have a plaintext PIN, so login accepts a plaintext match once and upgrades it to bcrypt on that successful login. After all kids have logged in once this fallback is dead code.
- The seed never overwrites existing users (`update: {}`), so `db:seed` on prod is safe, but do not run it against prod without a reason.
- Never use `prisma db push` or `migrate dev` / `migrate reset` against prod.
- Local: `npm run db:migrate` / `npm run db:seed` are explicit; `npm run dev` is plain `next dev`.

## Grade + math-progress migration (`20260401000000_add_grade_and_math_progress`)

Purely additive: `User.grade`, five nullable `SpellingWord` columns (grade, unitId, tier, syllables, source) + two indexes, and two new empty tables (`MathSkillProgress`, `MathAttempt`). No existing column is dropped, renamed or retyped. (`prisma migrate dev` cannot run against the local/prod-copy DBs because of the two lost prod migrations, so the SQL was generated with `prisma migrate diff --from-migrations ... --shadow-database-url <scratch db>`.)

Rehearsal on `prodsim` (a pristine prod restore), run after the baseline step above:
1. Row counts before: `sh counts.sh prodsim > before` (per-table `select count(*)`).
2. `DATABASE_URL=<prodsim> npx prisma migrate deploy`
3. Row counts after: every existing table identical; only new rows are `MathAttempt 0`, `MathSkillProgress 0`, and `_prisma_migrations` +1.
4. `npx prisma migrate diff --from-url <prodsim> --to-schema-datamodel prisma/schema.prisma --script` -> `-- This is an empty migration.`

Prod steps: same as the main runbook (backup, counts, `migrate deploy`, re-run counts + diff). Rollback is app-only: the new columns/tables are ignored by the old build; to undo the schema (only if needed) drop the two new tables and the six new columns.

### Spelling import (after the migration)
`DATABASE_URL=<target> npm run db:import-spelling` (add `-- --dry-run` to preview). Idempotent: inserts the 1,431 curriculum words, only fills NULL fields on the 54 legacy rows (grade, unitId, category, source='legacy'), never overwrites or deletes. Rehearsed on `prodsim` and local: first run `inserted 1431, updated 54, total 1485`; second run `0 / 0 / 1485`. Run it on prod only with JC's approval.

## Parent unlock migration (`20260501000000_add_math_unlocked_by_parent`)
Purely additive: one column, `MathSkillProgress.unlockedByParent BOOLEAN NOT NULL DEFAULT false` (a constant default, so Postgres adds it as metadata only; no table rewrite, no existing column touched). It backed the per-kid mission unlock switches on `/parent` (removed; the column is now unused). SQL generated the same way as the previous one: `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <scratch db> --script`.

Rehearsal (local `braylee` DB and `prodsim`, both already on `20260401000000_*`):
1. Row counts before: `sh counts.sh <db> > before`.
2. `DATABASE_URL=<db> npx prisma migrate deploy` -> "All migrations have been successfully applied."
3. Row counts after: every table identical; only `_prisma_migrations` is +1 (5 -> 6).
4. `npx prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma --script` -> `-- This is an empty migration.` (both DBs).

Prod steps: see "Deploy order" above. Rollback is app-only: the old build ignores the column; to undo the schema (only if needed) `ALTER TABLE "MathSkillProgress" DROP COLUMN "unlockedByParent";`.

Behaviour notes shipped with it: `/api/math/attempt` now judges answers with `lib/curriculum` `checkAnswer` and mastery with `masteryStatus` (level advance after 10 problems that meet the skill's accuracy + time rule; skill mastery keeps the last-20 window on the last level); the skill list is `lib/curriculum/math/spec.json` only. (`/api/parent/unlocks` was later removed together with `/parent`.)
