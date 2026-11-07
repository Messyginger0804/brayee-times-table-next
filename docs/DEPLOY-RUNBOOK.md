> WARNING: merging `ui-overhaul` into `main` auto-deploys to production through Vercel's git integration.
> ALL database steps below run BEFORE the merge, while prod still runs the old code. Every migration is additive
> (new nullable/defaulted columns and new empty tables), so the old code keeps working on the migrated schema.
> Never merge first: the new code selects columns that do not exist yet (see "If the code ships before the migrations").

# Production deploy runbook: adopting the migration history + guest seats

Status: rehearsed on a local restore of the prod dump (`prodsim` database in the local docker db), including the exact diff / resolve / deploy / status / cleanup dry-run commands below. NOT yet run against prod.

## Why this is needed

Prod's schema is ahead of the old repo. Prod's `_prisma_migrations` lists three finished migrations:

| migration | in repo? |
|---|---|
| `20250817_init` | yes, byte-identical (checksum `3724b899...205c` matches) - never edit it |
| `20260129173431_add_login_security` | no (source lost) |
| `20260129174704_add_user_mastery` | no (source lost) |

`prisma/migrations/20260301000000_baseline_prod_schema` is the catch-up: `init` + this migration = prod's exact schema (User.email/emailVerified/failedLoginAttempts/lockedUntil/isAdmin, UserProblem.mastered, Account, Session, VerificationToken, SpellingWord, SpellingAttempt). Prod already has all of that, so on prod it must be marked applied, never executed. Fresh databases run it normally.

The two lost migrations stay in prod's table untouched; Prisma only lists them as "not found locally" (`migrate deploy` and `migrate status` still succeed, exit 0).

Three more migrations are pending on prod and are all purely additive:

| migration | adds |
|---|---|
| `20260401000000_add_grade_and_math_progress` | `User.grade`, five nullable `SpellingWord` columns + two indexes, empty tables `MathSkillProgress`, `MathAttempt` |
| `20260501000000_add_math_unlocked_by_parent` | `MathSkillProgress.unlockedByParent BOOLEAN NOT NULL DEFAULT false` (unused now) |
| `20260601000000_add_guest_seats` | `User.isGuest` (default false), `guestSeat` (unique), `guestTokenHash` (unique), `lastActiveAt` |

## Account model

Braylee keeps the ONLY real account; everyone else plays as an anonymous guest seat (`lib/guests.js`). Guest data is wiped after 7 idle days. No sign-ups, no parent screens (`/parent`, `/api/parent/*` are gone; `isAdmin` and `unlockedByParent` stay in the schema, unused). Seat rows (`Guest 001`...) are created lazily by the app on the first guest request.

## Environment variables (set in the host, never committed)

| var | needed | meaning |
|---|---|---|
| `CRON_SECRET` | yes | bearer secret for the daily purge (`/api/cron/purge-guests`, scheduled in `vercel.json`). Without it the endpoint refuses everyone. |
| `GUEST_SEATS` | optional | number of guest seats, default 5, clamped 1-100. Lowering it leaves higher seats unreachable but they are still purged. |
| `GUEST_MIN_IDLE_MINUTES` | optional | a taken seat may be handed to a NEW device only after this many idle minutes (default 15). If all seats are taken and none has been idle that long, new guests see "All seats are busy, try again in a few minutes". |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | yes | already present on prod; check they still are. |

## Deploy steps, in this order

Use a shell where `DATABASE_URL` points at prod, from a checkout of the deploy commit (`ui-overhaul`). Steps 1-7 run BEFORE the merge. Stop at the first step whose expected result does not match.

1. **Backup** (custom format, restorable):
   `pg_dump -Fc "$DATABASE_URL" -f braylee-prod-$(date +%Y%m%d-%H%M).dump`
   Check it: `pg_restore -l <file> | head`, and keep a copy off the box.
2. **Row counts** (save the output):
   `psql "$DATABASE_URL" -Atc "select 'User',count(*) from \"User\" union all select 'UserProblem',count(*) from \"UserProblem\" union all select 'Attempt',count(*) from \"Attempt\" union all select 'SpellingWord',count(*) from \"SpellingWord\" union all select 'Problem',count(*) from \"Problem\""`
3. **Verify prod matches the BASELINE schema** (not the final one - the final schema has the columns that are still missing, so diffing against `schema.prisma` here would always print SQL). Build a copy of the migrations that stops at the baseline and diff prod against it. `<scratch>` is any empty throw-away database (the shadow database; not prod):
   ```
   mkdir -p /tmp/baseline/migrations
   cp -r prisma/migrations/20250817_init prisma/migrations/20260301000000_baseline_prod_schema prisma/migrations/migration_lock.toml /tmp/baseline/migrations/
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-migrations /tmp/baseline/migrations --shadow-database-url <scratch> --script
   ```
   Expect exactly `-- This is an empty migration.` If it prints SQL, STOP: prod drifted from what the baseline assumes. Do not continue.
4. **Adopt the baseline** (writes one row to `_prisma_migrations`, changes no data):
   `npx prisma migrate resolve --applied 20260301000000_baseline_prod_schema`
5. **Apply the three additive migrations**, then verify nothing is pending:
   `npx prisma migrate deploy` -> applies `20260401...`, `20260501...`, `20260601...` ("All migrations have been successfully applied").
   `npx prisma migrate status` -> "Database schema is up to date!" (it still lists the two lost prod migrations as not found locally; that is expected).
   Final-schema diff, now expected empty: `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` -> `-- This is an empty migration.`
   Row counts (step 2) must be identical; only `_prisma_migrations` is +4 (baseline + 3).
6. **Account cleanup.** Dry run first (default; writes nothing, always rolled back):
   `npm run db:cleanup-accounts -- --i-have-a-backup`
   Read it: `Braylee` is keep, `braylee, Bray, bray` are merge, everyone else is delete. (The output lists real user names: do not paste it anywhere public.) Rehearsal: 77 + 5 + 35 + 72 = 189 attempts for Braylee.
   Then apply (one transaction, idempotent):
   `npm run db:cleanup-accounts -- --confirm --i-have-a-backup`
   Verify: `select count(*) from "User" where not "isGuest"` -> 1; Braylee's attempt count = the dry-run sum; `Problem` / `SpellingWord` counts unchanged vs step 2. A second `--confirm` is a no-op ("merge: (none left)", "delete: 0 users").
7. **Set the env vars** in the Vercel production environment: `CRON_SECRET` (required), `GUEST_SEATS` / `GUEST_MIN_IDLE_MINUTES` only if not using the defaults, and check `NEXTAUTH_SECRET` / `NEXTAUTH_URL` exist. Optionally add a Vercel Firewall rate-limit rule on the auth and guest-claim routes (the app has a best-effort in-memory limit per instance, see below).
8. **Merge `ui-overhaul` into `main`.** This deploys. Watch the build.
9. **Smoke test:**
   - Braylee + PIN logs in and shows the merged history; `/api/auth/me` returns `isGuest:false`.
   - A wrong PIN returns 401; the 5th wrong PIN returns 429 with a "short break" message; the right PIN is refused while resting.
   - "Play as Guest" gives Cadet 001.
   - `/api/spelling/words` returns `"source":"db"`.
   - `POST /api/auth/register` -> 404; `/parent` -> 404; `POST /api/problems/1/score` and `/mastered` -> 404.
   - `/api/cron/purge-guests` without the bearer -> 401, with it -> `{"purged":0}`.
10. **Rollback plan** (have it ready before step 8):
    - App: redeploy the previous build. The new columns/tables are ignored by it, so the migrated schema keeps working. Note the old (lost) prod code is what hashes PINs; the repo's pre-overhaul code compares plaintext and would not log in hashed users. Accounts deleted by step 6 do not come back without the backup.
    - Data: the ONLY undo for step 6 is the step 1 backup. Restore into a NEW database (`createdb`, `pg_restore --no-owner -d <new> <backup>`), repoint `DATABASE_URL`; never restore over the live DB.
    - Baseline row (step 4): `delete from _prisma_migrations where migration_name = '20260301000000_baseline_prod_schema';` (no schema change to undo).
    - Schema (only if really needed): `ALTER TABLE "User" DROP COLUMN "isGuest", DROP COLUMN "guestSeat", DROP COLUMN "guestTokenHash", DROP COLUMN "lastActiveAt", DROP COLUMN "grade";` `ALTER TABLE "MathSkillProgress" DROP COLUMN "unlockedByParent";` drop the two new tables and the five new `SpellingWord` columns, and delete the matching `_prisma_migrations` rows.

## If the code ships before the migrations

The runtime fails safe instead of crash-looping. A Prisma "column/table does not exist" error that names a table/column added by this PR's migrations (list in `lib/dbErrors.js`; P2022 / P2021, or P2010 with Postgres 42703 / 42P01 for raw queries) is caught in `lib/pinAuth.js` (login), `lib/auth.js` (guest sign-in), `/api/guest/claim`, `/api/guest/status`, `/api/auth/me` and the purge cron, and answered with HTTP 503 `{"error":"The game is getting an upgrade! ...","maintenance":true}` plus `Retry-After`. Nothing is written, no error detail leaks (the server log gets only the Prisma code and the column name), and any other database error still surfaces as a normal 500. Fix = run steps 3-5 from the checkout; the app recovers on its own. Other API routes that touch new columns can still return a plain 500 until the migrations are applied, so treat this as a safety net, not a plan.

## Login lockout and guest seats (runtime behaviour)

- Login lockout (`lib/pinAuth.js`): each attempt first claims a slot with ONE conditional `UPDATE` (counter + 1, lock applied, lock checked, all in the same statement), so a parallel burst cannot test more than 5 PINs. 5-9 wrong in a row = 1 minute rest, 10-14 = 5 minutes, 15-19 = 30 minutes, 20-24 = 2 hours, 25+ = 24 hours (applied again on every further wrong try); a correct PIN resets it. Unknown name, wrong secret and a resting account all get the same 401 and message ("That didn't work. Check your name and number, or try again in a little while.") and the same bcrypt work, so a nickname cannot be probed through the login form. Uses the existing `failedLoginAttempts` / `lockedUntil` columns only, no migration.
- Per-IP limits are in-memory (bounded to 5000 keys, oldest evicted) and PER SERVER INSTANCE (serverless instances do not share them), so they are best effort: login 30 attempts / 10 min / IP, new guest seat 10 / 10 min / IP. For a hard limit add a Vercel Firewall rule.
- Guest seats (`lib/guests.js`): free seats first. A taken seat is reused only if idle for at least `GUEST_MIN_IDLE_MINUTES` (default 15); otherwise `/api/guest/claim` answers 503 "All seats are busy, try again in a few minutes" and the login screen shows it. Reuse and purge are compare-and-set on the seat's token hash and `lastActiveAt`, so two claims cannot take one seat.

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

Prod steps: see "Deploy steps, in this order" above. Rollback is app-only: the old build ignores the column; to undo the schema (only if needed) `ALTER TABLE "MathSkillProgress" DROP COLUMN "unlockedByParent";`.

Behaviour notes shipped with it: `/api/math/attempt` now judges answers with `lib/curriculum` `checkAnswer` and mastery with `masteryStatus` (level advance after 10 problems that meet the skill's accuracy + time rule; skill mastery keeps the last-20 window on the last level); the skill list is `lib/curriculum/math/spec.json` only. (`/api/parent/unlocks` was later removed together with `/parent`.)

## Saved cadets migration (`20260701000000_add_saved_cadets`)

Purely additive: `User.savedCadet BOOLEAN NOT NULL DEFAULT false` and `User.savedAt TIMESTAMP(3)` (nullable). Constant default, so Postgres adds them as metadata only (no table rewrite); no existing column or row changes. SQL generated the same way as the others: `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <scratch db> --script`.

New env vars (both optional): `SAVED_CADETS_MAX` (default 10, Braylee not counted) and `SAVED_CADET_RETENTION_DAYS` (default 30). No other deploy step.

Rehearsal on a copy of `prodsim` (pristine prod restore): baseline resolved, `migrate deploy` applied everything pending including this migration, row counts of every pre-existing table identical (only the empty `MathAttempt` / `MathSkillProgress` tables from `20260401*` are new), `migrate diff --from-url ... --to-schema-datamodel` printed `-- This is an empty migration.`

**Order for this PR: back up, then migrate prod, THEN merge.** Merging deploys; the new code reads `savedCadet`, so it must not run before the columns exist.
1. Back up: `pg_dump -Fc "$DATABASE_URL" -f braylee-prod-$(date +%Y%m%d-%H%M).dump` (and check with `pg_restore -l`).
2. Row counts before (step 2 of the main runbook).
3. From a checkout of this PR's branch, with `DATABASE_URL` pointing at prod: `npx prisma migrate deploy`. It applies only what is pending (this migration, plus any earlier one prod does not have yet).
4. `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` must print `-- This is an empty migration.`; row counts must match step 2.
5. Merge the PR. Smoke test: Braylee signs in through "Are you a saved cadet? Sign in"; a guest can save a cadet and sign back in; `/api/cron/purge-guests` with the bearer answers `{"purged":N,"purgedSaved":0}`.

If the code ships first: the same fail-safe as above applies. Sign-in, guest claim/status, `/api/auth/me`, the purge cron and `POST /api/cadets/save` answer the 503 maintenance message (`lib/dbErrors.js` lists `User.savedCadet` / `User.savedAt`). Run step 3 and the app recovers on its own.

Rollback is app-only: the old build ignores both columns. To undo the schema (only if needed, and only after no saved cadet exists or their data is exported): `ALTER TABLE "User" DROP COLUMN "savedCadet", DROP COLUMN "savedAt";` and delete the matching `_prisma_migrations` row.

Cleanup rule: `npm run db:cleanup-accounts` refuses to run (even as a dry run) while any `savedCadet` exists unless `--include-saved-cadets` is passed; with it, saved cadets are deleted like every other non-Braylee user. Do not pass it in production unless that is the intent.

Behaviour: a saved cadet's progress stays on the seat's own row (`id` unchanged); the student ID is bcrypt-hashed into `User.pin` (the same atomic lockout as Braylee: 5 wrong = 1 min, 10 = 5 min, 15+ = 30 min). A saved cadet idle for more than `SAVED_CADET_RETENTION_DAYS` is deleted with all their data (attempts, tests, progress, row), lazily and by the daily cron; Braylee is never purged. Only a guest session can save; every API route is scoped to the signed-in caller's own id, so a saved cadet can read and write only their own data.

### PIN pepper (no new env var)

New hashes are `bcrypt(HMAC-SHA256(pepper, secret))`. The pepper is derived from `NEXTAUTH_SECRET` with HKDF (fixed label `pin-pepper-v1`), so there is nothing new to set in production and the key never touches the database or its backups. Verification tries the peppered hash first, then the old plain bcrypt, then legacy plaintext; a row in an older format is rehashed with the pepper on its next successful sign-in, so Braylee's existing 4-digit PIN keeps working and upgrades itself the first time she signs in.

**Rotating `NEXTAUTH_SECRET` invalidates every peppered PIN and student ID** (Braylee and all saved cadets) along with all sessions. Braylee's PIN would have to be reset by hand (a plain `bcrypt` hash of the PIN in `User.pin` is accepted and re-peppered on sign-in); saved cadets would have to save again. Do not rotate it casually.

The password-manager opt-out for these fields (text input with a CSS mask, `autocomplete="off"`, `data-1p-ignore` etc.) is deliberate: do not turn them into `type="password"` fields.
