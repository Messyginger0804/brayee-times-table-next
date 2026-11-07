# API reference

Every route handler under `app/api`. All are Route Handlers using JSON; all export `dynamic = 'force-dynamic'` (never cached) except the next-auth catch-all and `POST /api/auth/logout`. For how identity works see [ARCHITECTURE.md](ARCHITECTURE.md#identity-model); for tables see [DATA-MODEL.md](DATA-MODEL.md).

## Conventions

**Callers.** Braylee is the one real account (PIN login). A Guest is a claimed guest seat. "Signed in" means either. "Anyone" needs no session.

**Signed-in check.** `app/api/_utils.js` resolves the next-auth JWT session. For a guest session it also purges idle seats, confirms the seat still belongs to this device (token hash equals the JWT's `gk`) and refreshes `lastActiveAt` at most once a minute. A wiped or rotated seat is treated as signed out.

**Common errors.**

| Status | Body | When |
|---|---|---|
| 401 | `{ "error": "Not logged in" }` | No session, or the guest seat is gone (including mid-write, see below) |
| 503 | `{ "error": "<message>", "maintenance": true }` + `Retry-After: 120` | Database is behind the code (migrations not applied). Only routes noted as such |
| 500 | `{ "error": "<short message>" }` | Unexpected database error in routes that catch it; others throw and return an empty 500 |

**Writes for signed-in users** run in a transaction (15 s timeout) via `guestSafe`. For a guest this first takes a share lock on the seat row and checks the token; if the seat was lost in the meantime the route answers `401 Not logged in` and nothing is written. Routes that do this are marked "guest-safe write".

**Rate limits** (in memory, per server instance, best effort): login 30 per IP per 10 minutes; new guest claim 10 per IP per 10 minutes.

## Auth

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `GET, POST /api/auth/[...nextauth]` | Anyone | next-auth protocol. Providers: `credentials` (fields `name`, `pin`) and `guest` (no fields; reads the `guest_seat` cookie) | next-auth responses and session cookie | Sets the JWT session cookie. A failed PIN returns a next-auth error; a 429/503 condition is surfaced as an error message |
| `GET /api/auth/me` | Signed in | none | Braylee: `{ id, name, level, image, isGuest: false, grade }`. Guest: `{ id, name: "003", level, image: null, isGuest: true, seat, grade }` (`name` is the 3-digit seat label) | For a guest whose `guest_seat` cookie hash matches the seat, re-sets the cookie (renews the 7 days). 401 not logged in; 404 user not found; 503 maintenance |
| `POST /api/auth/link-cookie` | Signed in | none | `{ ok: true, id }` | Expires any leftover `device_trust` cookie. Called by the login page after a PIN sign-in. 401 `{ error: "Not authenticated" }` when no session. The name is historical |
| `POST /api/auth/logout` | Anyone | none | `{ success: true }` | Expires the legacy `device_trust` cookie only. The actual sign-out is next-auth's `signOut` on the client (`lib/signOut.js`) |
| `POST /api/auth/login` | Anyone | JSON `{ name, pin }`; both required | `{ id, name, level, image }` | Runs the same PIN check and lockout as the next-auth credentials provider but does **not** create a session. The app does not call it (tests only). Expires the legacy cookie. Errors: 400 missing name or PIN; 401 wrong name/PIN or malformed PIN; 429 locked or IP-limited (with `Retry-After` and `retryAfter`); 503 maintenance |
| `GET, POST, PUT /api/auth/register` | Anyone | any | `404 { error: "Not found" }` | Stub. Sign-ups are closed |

PIN lockout tiers (5, 10, 15 wrong in a row: 1 min, 5 min, 30 min) are described in [ARCHITECTURE.md](ARCHITECTURE.md#lockout-tiers).

## Guest seats

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `POST /api/guest/claim` | Anyone | JSON `{ mode: "resume" \| "new" }`. Anything other than `"resume"` is treated as `"new"` | `{ seat, label }` (`label` is the 3-digit string) | `resume`: keeps this device's seat and renews the cookie; 409 `No guest seat on this device` (and clears a stale cookie) if the device has none. `new`: rate limited; releases (wipes) the seat this device already holds, then takes a free seat or the longest-idle eligible one (wiping it) and sets the `guest_seat` cookie (httpOnly, 7 days). Errors: 429 slow down (`Retry-After`); 503 `{ busy: true }` with `Retry-After: 300` when all seats are busy; 503 with `Retry-After: 5` when the old seat could not be released; 503 maintenance |
| `GET /api/guest/status` | Anyone | none (reads the cookie) | `{ resume: { seat, label } \| null }` | Lazily purges idle seats. Clears the cookie if it points to a wiped or taken-over seat. 503 maintenance |

After a successful claim the client calls next-auth `signIn('guest')` to start the session.

## Cron

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `GET /api/cron/purge-guests` | Vercel cron (daily 04:00 UTC, `vercel.json`) | Header `Authorization: Bearer <CRON_SECRET>` | `{ purged: <number> }` | Wipes guest seats idle more than 7 days. 401 `Unauthorized` on a missing or wrong secret, and always when `CRON_SECRET` is unset. 503 maintenance |

## Times tables (Problem rows)

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `GET /api/problems` | Anyone | none | Array of `Problem` rows `{ id, problem: "7 x 8", answer, correct, incorrect, mastered }` | If the table is empty, seeds the 144 facts (1-12 x 1-12) first. Note `correct`/`incorrect` are global counters across all players |
| `GET /api/problems/count` | Anyone | none | `{ count }` | None. Not used by the client |
| `POST /api/problems/[id]/attempt` | Signed in | Path `id` integer (400 `Invalid problem id`). JSON `{ correct: boolean }` (400 `Missing boolean \`correct\``) | `{ success: true }` | Guest-safe write: inserts an `Attempt`; keeps only the newest 5 attempts for that user and problem; increments `Problem.correct` or `.incorrect`; recomputes mastery (last 3 attempts all correct): on a correct answer upserts `UserProblem` with `everCorrect = true` and `mastered`; on a miss sets `mastered = false` on an existing `UserProblem`. 500 `Failed to record attempt` on a database error (including an unknown problem id) |
| `GET /api/problems/[id]/last5` | Signed in | Path `id` integer | `{ correctCount, totalCount, attempts: [Attempt] }` (newest first, max 5) | None |
| `GET /api/attempts/last5` | Signed in | none | `{ summaries: { "<problemId>": { attempts: [{ id, problemId, isCorrect, createdAt }], correctCount, totalCount } } }` | None. 500 on error |
| `GET /api/progress/summary` | Signed in | none | `{ problemIds: [ids ever answered correctly], masteredIds: [ids currently mastered] }` | None |
| `GET /api/progress/level/[level]/status` | Signed in | Path `level` = 1 or 2 (400 `Invalid level`) | `{ level, total, correctCount, masteredCount, allCorrect }` | None. Level 1 = both factors 5 or less (25 facts); level 2 = all. Not used by the client |
| `POST /api/users/level` | Signed in | JSON `{ level: 1 \| 2 }` (400 `Level must be 1 or 2`) | `{ id, name, level, image }` | Guest-safe write of `User.level`. Setting 2 requires every level-1 fact to have `everCorrect`, else 400 `Complete all Level 1 problems...` |
| `GET /api/test/best` | Signed in | none | The highest-scoring `Test` row, or `null` | None. Not used by the client |
| `POST /api/test/score` | Signed in | JSON `{ score: number }` (400 `Score required` when not a number) | `{ success: true }` | Guest-safe write: inserts a `Test` row. Only type-checked, so a non-integer or out-of-range number fails as a 500. Not used by the client: Testing mode does not save a score |

## Math missions

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `GET /api/curriculum/me` | Signed in | Query `grade` = `1`-`6` or `all` (400 `grade must be 1-6 or all`). Default: the player's own grade; a player with no grade sees all grades | `{ grade, shownGrade, skills: [{ id, grade, order, name, levelCount, levelNames, levelIndex, mastery, source, unlocked, mastered, progress }] }`. `source` is `"generated"` or `"problems"` | None. 404 `User not found` |
| `POST /api/math/attempt` | Signed in | JSON: `skillId` (known id), `prompt` (string, 1-300), `expected` (string, 1-100), `given` (string, up to 100, may be empty), `ms` (number >= 0, capped at 600000). Optional: `answerType`, `requireSimplest`, `choices` (strings, max 6) | `{ correct, feedbackHint?, leveledUp, masteredNow, progress: { skillId, levelIndex, levelCount, mastered, attempts, windowSize, levelNeed, levelHave, windowAccuracy } }` | Guest-safe write: locks the player's `MathSkillProgress` row, appends `{c, ms}` to the rolling window, inserts a `MathAttempt`, may advance `levelIndex` (non-final level: last 10 meet the skill's accuracy and time rule) or set `mastered` (final level: last `window`, normally 20). Errors: 400 invalid JSON, unknown `skillId`, bad fields, or a times-table skill (those use `/api/problems/[id]/attempt`) |

The server judges `given` against the client-supplied `expected` using the curriculum library's `checkAnswer`; it does not regenerate the problem. A player can only affect their own progress.

## Profile

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `PUT /api/me/grade` | Signed in | JSON `{ grade: integer 1-6 }` (400 `grade must be 1-6`) | `{ grade }` | Guest-safe write of `User.grade` for the caller only |

## Spelling

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `GET /api/spelling/words` | Anyone (a session only supplies the default grade) | Query: `grade` 1-6, `unit` (1-16 letters or digits, case-insensitive, for example `g3u6`), `tier` (`core`, `hf` or `bee`). 400 with a message on invalid values | `{ source: "db" \| "fallback", grade, words: [{ id, word, partOfSpeech, definition, sentence, difficulty, category, grade, unitId, tier, syllables }] }` | None. Without `grade`, the signed-in player's grade is used; if that grade has no rows (and no `unit`/`tier`), all active words are returned with `grade: null`. If the query fails, or the table has no active words and no `grade`/`unit`/`tier` filter applies, returns the bundled `lib/spellingWords.json` with `source: "fallback"` (`grade: null`). An explicit filter that matches nothing returns `source: "db"` with an empty `words` array |

Spelling answers are checked in the browser and are not stored.

## Avatars

| Method and path | Caller | Request | Response | Side effects |
|---|---|---|---|---|
| `GET /api/avatar` | Signed in | Query `size` = `160`, otherwise `512` | Image bytes of the caller's own photo from the gitignored `private/avatars.json` map, `Cache-Control: private` | None. 401 not logged in; 404 (empty body) if no mapped photo. Never accepts a name or id |
| `GET /api/avatar/host` | Anyone | Query `size` = `160`, otherwise `512` | The app host's photo from `private/avatars.json` (key `host`) when present; otherwise a 307 redirect to the committed `/braylee/face-<size>.webp` | None |

## Unused and legacy routes

| Route | Status |
|---|---|
| `/api/auth/register` | 404 stub for GET, POST, PUT |
| `/api/auth/login` | Works, but the app signs in through next-auth and never calls it |
| `/api/auth/link-cookie`, `/api/auth/logout` | Only handle the removed `device_trust` cookie; kept for browsers that still hold it |
| `/api/test/score`, `/api/test/best` | Work and are tested; the client never calls them |
| `/api/problems/count`, `/api/progress/level/[level]/status` | Work; not called by the client |

There is no `/api/problems/[id]/mastered` route (mastery is computed inside the attempt route) and no parent/admin API; both were removed.
