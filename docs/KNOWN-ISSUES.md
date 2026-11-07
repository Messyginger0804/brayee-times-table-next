# Known issues and open decisions

Gaps found in the code review that are **not fixed**. Each entry says what happens, the impact, the options and a recommendation. Nothing here is urgent for a single-family app, but each is a decision for the owner. Related: [OPERATIONS.md](OPERATIONS.md), [TESTING.md](TESTING.md).

| # | Issue | Area | Severity |
|---|---|---|---|
| 1 | [Missions re-lock after a miss on a shared fact](#1-missions-re-lock-after-a-miss-on-a-shared-fact) | Learning logic | Resolved |
| 2 | [Account lockout can be triggered by anyone](#2-account-lockout-can-be-triggered-by-anyone) | Availability | Medium (Decided 2026-11-07) |
| 3 | [Guest seats can be exhausted or taken over](#3-guest-seats-can-be-exhausted-or-taken-over) | Availability | Medium |
| 4 | [Curriculum docs disagree with the level-advance code](#4-curriculum-docs-disagree-with-the-level-advance-code) | Docs drift | Resolved |
| 5 | [Test gaps and no Postgres in CI](#5-test-gaps-and-no-postgres-in-ci) | Testing | Medium |
| 6 | [No full Content Security Policy](#6-no-full-content-security-policy) | Security | Low |
| 7 | [Unused `/api/test` routes and the `Test` table](#7-unused-apitest-routes-and-the-test-table) | Dead code | Low |
| 8 | [Spelling results are never saved](#8-spelling-results-are-never-saved) | Feature gap | Medium |
| 9 | [Legacy plaintext and un-peppered student-ID fallbacks](#9-legacy-plaintext-and-un-peppered-student-id-fallbacks) | Security | Low |
| 10 | [Celebration GIFs load from GIPHY](#10-celebration-gifs-load-from-giphy) | Privacy | Low (Decided 2026-11-07) |
| 11 | [Adoption runbook ordering](#11-adoption-runbook-ordering) | Ops | Low |

## 1. Missions re-lock after a miss on a shared fact

**Status: Resolved by the persisted-unlocks change (decided 2026-11-07).** Unlocks are now stored per player in `SkillUnlock` and never removed (except by a seat wipe or a saved-cadet purge, like all other progress), so a later miss cannot lock a mission again. The unlock rule (previous skill mastered) is unchanged and was deliberately not loosened. Existing players are backfilled the first time their map loads after deploy. The text below is kept for history.

**Where:** `lib/skillState.js` (unlock rule), `app/api/problems/[id]/attempt/route.js` (clears `UserProblem.mastered` on any miss).

**What happened:** For the times-table missions backed by `Problem` rows, a skill counts as mastered only while every fact in it is currently mastered, and the next mission unlocked only while the previous one was mastered. Several consecutive grade 3 missions share facts (for example 3 x 2 is in two of them). One miss cleared that fact's `mastered` flag, so the earlier mission stopped being mastered and the later one locked again.

**Impact was:** Braylee could finish a mission, unlock the next, miss one shared fact while playing it, and see the mission she was playing show as locked on the map.

**Options considered:** (1) real attempt counts for problem-backed skills; (2) unlock on an "ever mastered" signal such as `everCorrect`; (3) leave as is. The owner chose to persist unlocks instead of loosening the gate.

## 2. Account lockout can be triggered by anyone

**Status: Decided 2026-11-07.** Keep the current escalating lockout for brute-force resistance. When the account is locked, use the unlock SQL in [OPERATIONS.md](OPERATIONS.md#unlock-a-locked-out-account). The options below are kept for history.

**Where:** `lib/pinAuth.js` (`claimAttempt`), `/api/auth/login`, `/api/auth/callback/credentials`.

**What happens:** The lockout counts wrong student IDs per account, not per person. `failedLoginAttempts` only resets on a correct ID (it never decays with time). The tiers escalate (5 wrong = 1 minute, 10 = 5 minutes, 15 = 30 minutes, 20 = 2 hours, 25 or more = 24 hours) and from 25 failures on every further wrong ID re-applies a 24 hour lock. The account name `Braylee` is public (branding), and a saved cadet's nickname is shown to the kid. The per-IP limit (30 per 10 minutes) is in memory and per serverless instance. Since the saved-cadets change, failures are uniform: an unknown name, a wrong ID and a resting account all return the same 401 and message, so the response no longer confirms that an account exists (earlier versions answered 429 for the real account).

**Impact:** Anyone who knows a name can keep that account locked out, and after enough attempts the lock lasts 24 hours at a time. Recovery is the owner running the unlock SQL in [OPERATIONS.md](OPERATIONS.md#unlock-a-locked-out-account). No data is exposed; this is a denial of service. Recovery is the owner running the unlock SQL in [OPERATIONS.md](OPERATIONS.md#unlock-a-locked-out-account). No data is exposed; this is a denial of service.

**Options:**
1. Decay `failedLoginAttempts` after a quiet period and do not extend the lock when already at the maximum.
2. Cap the lock at a short time (for example 60 seconds) and rely on slowing guesses, since a short student ID with a short cap is still limited by the per-IP throttle.
3. Add a durable (database or key-value) throttle per name and IP in front of the lockout.
4. Accept the risk (a child's app with a public name but a small audience).

**Recommended:** Option 1 now (small change, no new infrastructure; matters more now that the lock can reach 24 hours), option 3 only if abuse is ever seen.

## 3. Guest seats can be exhausted or taken over

**Where:** `/api/guest/claim`, `lib/guests.js`, `lib/rateLimit.js`.

**What happens:** (Saved cadets add a second shared pool: `SAVED_CADETS_MAX`, default 10, limited to 10 saves per IP per 10 minutes, per instance. A script that makes guest sessions can fill it, after which real kids see "spots are taken" and keep playing as guests.) `POST /api/guest/claim` needs no login. Its rate limit (10 per 10 minutes per IP) is in memory and per serverless instance, so it does not hold across instances. A client with no cookie can claim every free seat, and after `GUEST_MIN_IDLE_MINUTES` (default 15) of inactivity a seat can be taken over, which wipes that player's attempts and progress.

**Impact:** A script can leave real kids with "All seats are busy", and can take over a seat whose player paused for 15 minutes (a snack break). The loss is a guest's progress only; Braylee's account is not affected.

**Options:**
1. Raise `GUEST_MIN_IDLE_MINUTES` (an env var, no code change) and `GUEST_SEATS`.
2. Replace the in-memory limiter with a shared one (a database table or a hosted key-value store).
3. Add a Vercel Firewall rate-limit rule on `/api/guest/claim` and the login routes (no code).
4. Accept the risk.

**Recommended:** Option 3 plus a higher idle floor (option 1, for example 60 minutes). Option 2 only if the app becomes widely used.

## 4. Curriculum docs disagree with the level-advance code

**Where:** `lib/mathSkills.js` (`LEVEL_ADVANCE_WINDOW = 10`), `docs/curriculum/math.md`, `lib/curriculum/README.md`, JSDoc in `lib/curriculum/math/mastery.js`.

**Status:** Resolved in the working tree: `docs/curriculum/math.md` and `lib/curriculum/README.md` now describe the 10-problem level window and the 20-problem last-level window, and say there is no parent override. Check the JSDoc in `lib/curriculum/math/mastery.js` if you want to be sure it matches. The text below is kept for history.

**What happens:** The app advances a level after the last 10 problems meet the skill's accuracy and time rule; only the last level uses the 20-problem window. The curriculum docs describe a 20-problem window for every level and mention a parent override that no longer exists. With a 95 percent rule over 10 problems, one miss (or one slow answer) blocks the advance, whereas 19 of 20 would pass.

**Impact:** Anyone tuning the curriculum from the docs gets the wrong thresholds.

**Options:**
1. Update the docs and JSDoc to describe the 10-problem level window and the 20-problem last-level window.
2. Change the code so thresholds scale with the window (for example allow one miss in 10).

**Recommended:** Option 1 now (documentation only). Choose option 2 separately, as a product decision about how forgiving levels should be.

## 5. Test gaps and no Postgres in CI

**Where:** `tests/`, `.github/workflows/ci.yml`.

**What happens:**
- CI has no Postgres service, so `tests/guestWrite.pg.test.js` and `tests/savedCadets.pg.test.js` (the real-database tests) are skipped. The `FOR SHARE` and compare-and-set protections, and the saved-cadet save/purge transactions, are verified only by mocks in CI.
- Routes with no test: `/api/test/score`, `/api/test/best`, `/api/progress/*`, `/api/problems`, `/api/problems/count`, `/api/problems/[id]/last5`. (The purge cron auth gate and `/api/auth/me` are covered by `tests/api/cronAndMe.test.js`.)
- CI does not run a typecheck.

**Impact:** A regression in an untested auth check or in the seat-locking SQL could ship with CI green.

**Options:**
1. Add a `postgres` service to the `test` job, run `prisma migrate deploy` against it, and set `TEST_DATABASE_URL` and `DATABASE_URL` so the gated test runs.
2. Add 401 and happy-path tests for the untested routes.
3. Add `npx tsc --noEmit` to CI.

**Recommended:** Do 1 and 2. Note the pg test only runs for a localhost URL, which a service container on the runner satisfies. Option 3 is low value while `checkJs` is off.

## 6. No full Content Security Policy

**Where:** `next.config.js` `headers()`.

**What happens:** Every route now sends `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` (tested in `tests/securityHeaders.test.js`). There is no CSP that restricts scripts, styles, images or media.

**Impact:** Clickjacking is blocked, but a CSP is not available as a second line of defence against injected script. There is no known injection path today; it is defence in depth.

**Options:**
1. Add a full CSP. It must allow Next's inline scripts (nonce or hash), three.js and framer-motion behaviour, the local audio files, the GIPHY image host (until issue 10 is resolved) and `data:` or `blob:` where used.
2. Add it in report-only mode first, then enforce.
3. Leave as is.

**Recommended:** Option 2, after issue 10 so the allow-list is small. Test every screen (3D avatar, audio, GIFs) before enforcing.

## 7. Unused `/api/test` routes and the `Test` table

**Where:** `app/api/test/score/route.js`, `app/api/test/best/route.js`, table `Test`.

**What happens:** `POST /api/test/score` and `GET /api/test/best` have no tests, and nothing in `app/`, `components/` or `lib/` calls them. Testing mode does not save a score. `README.md` still mentions a "best test score" among the progress features.

**Impact:** Dead surface area that must still be kept authenticated, and a misleading README. Test results are never persisted.

**Options:**
1. Delete the routes (keep the table, or drop it in a later migration).
2. Wire Testing mode to save its score and show a best score.
3. Leave as is.

**Recommended:** Decide the product question first. If a best score is wanted, option 2; otherwise option 1. Either way, add tests for whichever remain (issue 5).

## 8. Spelling results are never saved

**Where:** table `SpellingAttempt` (`prisma/schema.prisma`), spelling UI.

**What happens:** The table exists and is wiped on guest purge and handled by the cleanup script, but nothing in `app/`, `lib/` or `components/` writes to it. There is no spelling-attempt route. Spelling Bee progress is not persisted. `docs/curriculum/spelling.md` now says that no spelling attempts are saved and that there is no level progression (the earlier 8-of-10 promotion idea is not built).

**Impact:** No spelling history and no adaptive spelling.

**Options:**
1. Add an authenticated route that records each answer, call it from the spelling round, and use it for promotion.
2. Remove the table in a migration and mark the spelling docs as aspirational.
3. Leave as is and clearly document it.

**Recommended:** Option 1 if spelling is a core feature; it needs a migration only if the columns change, plus guest-seat-safe writes (use `lib/guestWrite.js` like other guest writes). Until then, treat spelling progress as not saved.

## 9. Legacy plaintext and un-peppered student-ID fallbacks

**Where:** `lib/pinAuth.js` (`pinMatches`, `recordSuccess`, `canRehash`).

**What happens:** If `User.pin` is not a bcrypt hash, sign-in compares it as plain text; if it is a plain (un-peppered) bcrypt hash it is accepted too. On success, in production only (`VERCEL_ENV=production` or `PIN_REHASH=1`), the value is replaced with the peppered hash. The plaintext branch was for old rows. After the account cleanup only `Braylee` has a stored ID and the seed and `db:set-student-id` write plain bcrypt hashes, so the plain-bcrypt branch stays live until her first production sign-in after each reset; the plaintext branch should be dead code.

**Impact:** If a plaintext value were ever stored (a manual SQL edit, an old restore), it would be accepted and hashed. Low risk, but the plaintext path is unnecessary.

**Options:**
1. Check that `Braylee`'s stored value starts with `$2` (never print it), then remove the plaintext branch and its tests. Keep the plain-bcrypt branch: the script and seed rely on it.
2. Keep it as a harmless upgrade path.

**Recommended:** Option 1 after confirming the production row is hashed.

## 10. Celebration GIFs load from GIPHY

**Status: Decided 2026-11-07.** Keep GIPHY (its terms forbid copying the files), with the no-referrer and error-fallback mitigation shipped in this change. The options below are kept for history.

**Where:** `config/gifs.ts`, `components/gif/GifImage.jsx`.

**What happens:** About 60 celebration GIFs are loaded at runtime from `i.giphy.com`, and a welcome GIF is preloaded at session start. The browser sends the child's IP address and user agent to GIPHY, including for anonymous guests. `GifImage` now sets `referrerPolicy="no-referrer"` (so no referrer is sent for displayed GIFs; the cache-warming `new Image()` in `components/gif/GifProvider.jsx` does not set it) and hides the image if it fails to load, so a blocked network no longer shows a broken icon, but the reward is simply missing there.

**Impact:** A small privacy leak to a third party and an unreliable reward screen.

**Options:**
1. Self-host the chosen GIFs or WebP files under `public/gifs/` (some are already there) and point `config/gifs.ts` at them.
2. Keep GIPHY with the referrer policy and hide-on-error already in `GifImage` (done).
3. Leave as is.

**Recommended (decision for the owner):** Option 1 gives the best privacy and reliability and makes a strict CSP easy (issue 6). Check the licence terms for each GIF before bundling and watch the repository size. Option 2 is the cheap interim step.

## 11. Adoption runbook ordering

**Where:** [DEPLOY-RUNBOOK.md](DEPLOY-RUNBOOK.md) step 6. (The runbook also has Braylee's 4-digit PIN stop working at the deploy until step 9 sets her student ID, so there is a short window where she cannot sign in.)

**What happens:** The one-time runbook runs the irreversible account cleanup (deletes every non-Braylee user) before the new code is merged and verified. If the merge or build then fails, the users are already gone and the old code is still live. The only undo is the pre-migration dump.

**Impact:** Only relevant if that runbook has not yet been run, or is reused. Confirm its status with the owner first.

**Options:**
1. Move the cleanup to after the new build is deployed and smoke-tested, behind an explicit checkpoint.
2. Keep the order and accept the dump as the rollback.

**Recommended:** Option 1.

## Other notes

- **Student IDs must be exactly 7 digits (0-9 only).** Any saved cadet or account whose student ID is not exactly 7 digits (for example an older 5, 6 or 8 digit ID) can no longer sign in. IDs are stored only as hashes, so these accounts cannot be found with a query. Fix: have the cadet re-save, or run `npm run db:set-student-id` with a 7-digit ID (see [OPERATIONS.md](OPERATIONS.md#set-or-reset-a-student-id-npm-run-dbset-student-id)).
- `vercel.json` still lists `ui-overhaul` under `git.deploymentEnabled`. Harmless; delete it when next touching that file.
- `isAdmin` (on `User`) and `MathSkillProgress.unlockedByParent` are unused leftovers from the removed parent screen. They are kept so no migration is needed.
- A saved cadet has no self-service way to recover a forgotten student ID or to be renamed; only the owner can reset it with `npm run db:set-student-id`. Choosing a nickname that is already taken is reported to the kid ("Someone already has that name"), which also reveals that a saved cadet with that name exists.
- Per-IP rate limits are best effort only (in memory, per serverless instance). A Vercel Firewall rule is the only hard limit.
- The next-auth Prisma tables (`Account`, `Session`, `VerificationToken`) exist but stay empty because sessions are JWTs.
