# Gameplay guide

What the app does, from the player's and the parent's side. Every number here comes from the code; file names are given so you can check.

Related: [Development](DEVELOPMENT.md), [Data model](DATA-MODEL.md), [Math curriculum](curriculum/math.md), [Spelling curriculum](curriculum/spelling.md), [curriculum library](../lib/curriculum/README.md), [deploy runbook](DEPLOY-RUNBOOK.md).

## At a glance

| Area | What it is | Where it lives |
|---|---|---|
| Sign-in | A guest "cadet" seat, or a name + Student ID (Braylee, or a saved cadet) | `/login` |
| Grade picker | Pick 1st-6th grade; decides which missions and spelling words show | home `/` |
| Mission map | Planets, one per math skill in the chosen grade | home `/` |
| Memorize | Flash cards for times tables, no grading | home `/` (mode state, not a route) |
| Practice | Untimed times-table drill with feedback | home `/` |
| Testing | One-pass times-table test, one miss ends it | home `/` |
| Skill missions | Generated math problems with levels and mastery | `/skill/<id>` |
| Spelling Bee | Hear a word, type it | `/spelling-bee` |

Memorize, Practice and Testing are not separate routes; they are screens inside the home page.

## Signing in

There is no sign-up. Three kinds of player:

- **Play as Guest.** Guests get an anonymous "cadet seat". No name, no photo, nothing personal is collected.
- **Saved cadet.** A guest can keep their progress by tapping **Save my cadet** on the home screen (guests only). They pick a cadet name (2-16 letters, numbers, spaces, `'` or `-`; names reserved by the game and rude words are refused, and the name must not already be taken) and type a **Student ID** twice. The ID is exactly 6 digits, numbers only (the sign-in form describes it as "the 6 digit number you use for lunch at school"). The same seat becomes their account, so everything they already did is kept, and they are signed in as that cadet. Only a limited number of spots exist (`SAVED_CADETS_MAX`, default 10); when they are full the kid is told so and keeps playing as a guest. Next time they tap **Are you a saved cadet? Sign in** on the login screen and enter name and Student ID. A saved cadet who does not play for 30 days (`SAVED_CADET_RETENTION_DAYS`) is deleted with all their progress.
- **Braylee.** She uses the same "Are you a saved cadet? Sign in" form with the name `Braylee` and her Student ID (exactly 6 digits; the old 4-digit PIN no longer works). Her photo shows in the helmet and her progress is her own. Her initial value is set when the database is seeded (`SEED_BRAYLEE_PIN`, see [DEVELOPMENT.md](DEVELOPMENT.md)) or with `npm run db:set-student-id`; it is never in the repo.

Sign-in safety: the ID field is masked and password managers are told to ignore it. After 5 wrong tries in a row an account rests for 1 minute, after 10 for 5 minutes, 15 for 30 minutes, 20 for 2 hours and 25 or more for 24 hours. A wrong name, a wrong ID and a resting account all show the same message ("That didn't work. Check your name and student ID, or try again in a little while."), so nobody can tell which names exist. There is also a limit of 30 sign-in attempts per IP address per 10 minutes, answered with a "take a short break" message.

### Cadet seats (guests)

- The server has a fixed number of seats (`GUEST_SEATS`, default 5, allowed 1-100), named "Cadet 001", "Cadet 002" and so on. The number is the only identity.
- A device proves it owns a seat with a random secret in an httpOnly cookie (`guest_seat`). Only a hash of the secret is stored.
- On a device that already owns a seat, the login page shows **Continue as Cadet 003** (keep going) and **New guest** (release the old seat and start clean). Otherwise it shows **Play as Guest**.
- A seat that someone else holds can be given to a new device only after it has been idle for at least `GUEST_MIN_IDLE_MINUTES` (default 15). If every seat is busy the player sees "All seats are busy, try again in a few minutes".
- A seat idle for 7 days is wiped (attempts, progress, grade, level back to 1) and freed. The cleanup runs lazily on guest requests and daily from a cron job.
- The resume cookie lasts 7 days and is renewed while the cadet keeps playing. Signing out as a guest keeps the cookie on purpose, and the sign-out dialog says "Your cadet seat stays saved on this device for 7 days."
- Guests see a one-time welcome ("Welcome aboard, Cadet 003!" for a new seat, "Welcome back, Cadet 003!" for a resumed one). It shows once per claim, not on reload.

Anyone who is not signed in is sent to `/login`. If the server cannot be reached the app shows "Mission Control isn't answering." (in-app copy where "Mission Control" stands for the server) with a **Try again** button; it does not sign the player out or ask for the grade again.

## Grade picker

The first time a seat (or Braylee) has no grade, the home page asks "What grade are you in?" with buttons for 1st to 6th. The grade is saved on the user and decides which math missions show and which spelling words load by default. "Nth grade . Change" on the home menu reopens the picker. A wiped guest seat asks again.

## Home menu and mission map

- The header shows the helmet, "Cadet <name>", the voice toggle, Voice settings, Home and Sign out.
- A level chip shows the times-table level: a star for Level 1, a crown for Level 2. This is separate from the per-skill levels below.
- The **mission map** lists the grade's math skills as planets, three per row. A planet is one of: mastered (star), current (the first unlocked, unmastered skill, glowing), open, or locked (lock icon). The caption says "Locked", "x/y facts" (times-table skills), "Mastered!" or "Level i of n".
- Tapping a locked planet opens a friendly "Not yet, Cadet!" box ("Finish the mission before this one to open it."). Tapping a times-table planet offers **Practice** or **Memorize** limited to that skill's facts. Tapping any other planet opens `/skill/<id>`.
- Below the map are tiles for Memorize, Practice, Spelling Bee and Testing (locked until it is earned, see below).

### How missions unlock

Within one grade, skills are ordered. A skill is open when it is the first in the grade, or the previous skill is mastered, or it is already mastered or has attempts. Once opened it never re-locks. Grade is a starting point, not a gate: any grade can be picked.

## Modes

### Memorize

Flash cards over the current list of times-table facts. Tap a card to flip it and see the answer; **Next** moves on and loops forever. Nothing is graded and nothing is saved. The list is the 25 facts with both factors 5 or less at Level 1, all 144 facts (1 to 12) at Level 2, or the facts of a single mission if started from a planet.

### Practice

- Starts with the Ready-set-go intro, then shows a question and a number keypad (digits only; empty answers get "Tap some numbers first").
- Correct: +1 star and streak, a short pause (0.9 s), next question. Wrong: the answer is shown ("The answer is N"), the streak resets, pause 2.0 s, next question. Questions loop through the list.
- Every answer is sent to the server in the background (`POST /api/problems/<id>/attempt`) and never blocks the screen. The server keeps the last 5 attempts per player and fact, and shows hints such as "You have answered this right x out of the last y times".
- A fact counts as **done** for unlocking Testing the first time it is answered correctly. A fact counts as **mastered** (for the mission map) after 3 correct answers in a row; any miss clears that (`lib/mastery.js`).
- Finishing every fact in the list triggers fireworks and a "mastered" celebration. At Level 1, finishing the 25-fact set (once, not when scoped to one mission) also shows "You have unlocked the Level 1 Test".

### Testing

- Locked until every fact in the current list has been answered correctly at least once in Practice. The tile shows progress ("Completed x / y to unlock Testing"); tapping it while locked opens a "Keep Practicing" box with a button to Practice.
- A test is one pass through the list in shuffled order, no timer. One wrong answer ends it ("Game Over", encouraging text, **Try Again**). All right gives "Mission Complete!" with fireworks.
- Passing at Level 1 saves Level 2 (`POST /api/users/level`), which switches the lists to all 144 facts and shows the crown. The server refuses Level 2 unless every Level 1 fact has been answered correctly at least once. If the save fails the result box says so and offers **Try saving again**. Passing at Level 2 says "Perfect score!".
- The test score is shown on screen only. It is not stored.

### Skill missions

Planets that are not times tables are generated math practice (79 skills, 254 levels across grades 1-6; see the [math curriculum](curriculum/math.md)).

- A mission starts with Ready-set-go, then shows problems for the current level. Depending on the skill the keypad adds minus, decimal point, fraction bar, space and `R` (remainder), or the answer is chosen with buttons (`<` `>` `=`, yes/no, even/odd, prime/composite).
- The browser checks the answer for instant feedback and a kid-friendly hint, then sends it with the time taken to `POST /api/math/attempt`. The server judges the answer again; equivalent fractions, decimals, remainders and similar forms are accepted as the skill allows.
- A bar shows "Level i of n" and progress toward the next level.
- **Level-up rule (levels before the last):** the last 10 attempts at the level must reach the skill's accuracy target, and each correct answer must also be within the skill's seconds-per-problem. 95% skills need 10 of 10, 90% skills need 9 of 10. Then "Level N unlocked!" appears and the level's tally starts over.
- **Mastery rule (last level):** the last 20 attempts (the skill's window) must meet the same accuracy and time rule: 19 of 20 for 95% skills, 18 of 20 for 90% skills. Then "Mission complete!" appears, the next skill in the grade opens, and the skill stays mastered.
- The 10-problem level rule is deliberately stricter than the 20-problem spec for 95% skills; see [math.md](curriculum/math.md#how-the-app-applies-the-mastery-targets).
- Wrong answers show the answer after a pause (2.2 s, a little longer with a hint); right answers pause 0.9 s.
- If the server cannot be reached the player can keep going; the mission says "Couldn't save that one, but keep going!". A request that hangs is cut off after 8 seconds and is not retried, so an answer is never recorded twice. If the mission itself cannot load, a **Try again** panel appears.

### Spelling Bee

- Players with a grade get a picker: Grade (1-6), Words (All mixed, Core, Sight words, Bee challenge) and, for Core, a "Spelling pattern" (one of the units for that grade). A line says how many words are ready.
- A round starts with Ready-set-go, then a random word is spoken ("Spell: rocket"). The card shows part of speech, definition and the sentence with the word blanked out. **Hear word** and **Hear sentence** replay the speech.
- The answer is correct if it matches the word, ignoring capitals, surrounding spaces and curly versus straight apostrophes. Correct: "Correct!" for 1.4 s, then the next word. Wrong: "The word was X. You got this!" for 2.6 s, then the next word.
- Rounds never end by themselves; **Change words** goes back to the picker. Streak and stars are shown. Nothing is saved to the server.
- Words come from the database. If it is empty or unreachable, the app uses 54 bundled words (`lib/spellingWords.json`). Pronunciation always uses the browser's built-in speech; there are no spelling audio files.

## Streaks, stars and records

- A **streak** counts correct answers in a row in the current round and resets on a miss. Stars count correct answers in the round.
- The best streak per mode (practice, testing, skill, spelling) is remembered on the device. A "new best" celebration needs a previous best of at least 3.
- Streak celebrations appear at streaks 3, 5 and 10, then every 10th.

## Voice: Braylee's cheers and the teacher voice

Two different voices are used on purpose.

- **Braylee's voice** says short cheers ("You did it!", streak and level-up lines). These are pre-recorded clips (119 files in `public/audio/braylee/`) of Braylee's voice, produced outside this repo. A recorded clip exists for streaks of 3, 5, 10, 20 and 30; lines with a name or bigger streak counts, and any clip that fails to load, fall back to the browser voice.
- **The teacher voice** is the browser's built-in text-to-speech. It reads instructions, spelling words and sentences, and the Ready-set-go call. It runs on the device; no paid or network speech service is used.
- Spelling speech always wins: starting a spelling word cuts off any cheer, and cheers are not started while a word is being read.
- Cheers never shame; they cover correct answers, streaks, level-ups, mastery, wrong answers, test results and welcomes.
- Browsers may block sound before the first tap. Every audio path degrades quietly to the browser voice and then to silence.

### Voice settings

- The speaker button in the header mutes or unmutes cheers. Muting stops cheers only, never spelling words. Default is on.
- **Voice settings** ("Braylee's Voice") has a voice choice, a **Kid voice** switch (raises pitch; a little less while spelling so letters like B, D, P and T stay clear), a **Speed** slider (0.7 to 1.3) and **Try it**, which says a sample sentence. It does not appear when the browser has no speech support.
- Default voice preference: a child voice if the device has one, then a friendly English voice, then the system default.
- These settings are saved on the device only.

## Ready, set, go

Before Practice, Testing, a Skill mission and a Spelling round, a full-screen "Get ready" overlay counts: ready, 3, 2, 1, GO! (about 3.5 seconds in total), and says "Ready? 3, 2, 1, go!". The first question and its timer start only after it ends. Press the button, click, or press Enter, Space or Escape to skip. While it is up, other keys are blocked so digits cannot leak into the game. With reduced motion it shows one static "Let's go!" for 1 second.

## Celebrations, fireworks and GIFs

- **Fireworks** fire when a practice set, a test or a skill mission is completed (mastered). They are skipped when the device asks for reduced motion.
- **Mission modals** ("Level N unlocked!", "Mission complete!") show with a Braylee cheer.
- **GIF cards** (celebrate, streak, level-up, try-again, welcome) appear for about 2.2 seconds, or until tapped. A plain correct answer shows a celebration GIF about half the time, never closer than 3.5 seconds to the previous one. Streak milestones ignore that gap. The GIFs are loaded from GIPHY, with credit shown in the dev review page `/gifs` (that page is `next dev` only and returns 404 in production). If a GIF fails to load it is simply hidden.
- **One big moment at a time.** A modal outranks a streak card, which outranks a celebrate card, which outranks the astronaut's speech bubble. A higher moment replaces a lower one; a lower one that arrives later is dropped, not queued.
- The space background (stars, nebula, rocket, planets) is decorative. A 3D version loads after the page is idle when the device supports WebGL; otherwise a CSS starfield and emoji are used.

## Accessibility

- **Reduced motion.** The app follows the device's reduced-motion setting: animations are removed or simplified, fireworks are skipped, the intro becomes one static step, and the CSS stars stop moving.
- **Keyboard and focus.** A visible 3 px cyan focus outline everywhere. All dialogs (`Modal`, the voice dialog and the cadet welcome) move focus inside when they open, keep Tab inside, close on Escape and return focus to where it was. The shared `Modal` also renders in a portal and makes the rest of the page inert and hidden from screen readers while open.
- **Screen readers.** Each new question is announced through a polite live region ("Question: 7 x 8"), so the question text is not read twice. Feedback, hints, speech bubbles, spelling results and loading states use polite status regions; the Ready-set-go count and errors use assertive or alert roles. Decorative astronauts and the 3D canvas are hidden from assistive technology; fractions, powers and coins have text labels; progress bars have names.
- **Touch and keyboard input.** The keypad is made of real buttons (no phone keyboard pops up) and also accepts the physical keyboard. Buttons are at least 44 px; inputs are 18 px or larger to avoid iOS zoom.
- **Other.** The theme is dark only. Sound is optional and can be muted.

## What is stored where

| Data | Where | Notes |
|---|---|---|
| Account, grade, times-table level | Server database (`User`) | Braylee's and saved cadets' Student IDs are stored only as peppered bcrypt hashes. Saved cadets are deleted after 30 idle days. |
| Guest seat | Server database + httpOnly `guest_seat` cookie | Only a hash of the cookie secret is stored. Wiped after 7 idle days. |
| Session | NextAuth JWT cookie | Carries the user id (a hashed seat key for guests, a saved-cadet flag for saved cadets). |
| Times-table attempts and mastery | Server (`Attempt`, `UserProblem`, `Problem`) | Last 5 attempts per fact per player. |
| Math mission progress | Server (`MathSkillProgress`, `MathAttempt`) | Current level, rolling window, mastered flag. |
| Test score | Nowhere | Shown on screen only. |
| Spelling progress | Nowhere | Streaks and stars live only on screen. |
| Voice mute and voice settings | Browser `localStorage` | Per device (`braylee-voice-muted`, `braylee-voice-settings`). |
| Best streaks | Browser `localStorage` | Per device and mode (`braylee.bestStreak.<mode>`). |
| Host welcome shown | Browser `localStorage` (`host-welcomed`) | Per device. |
| Cadet welcome hand-off | Browser `sessionStorage` (`cadetWelcome`) | Read once and deleted. |

Storage access is wrapped so private browsing or blocked storage falls back to defaults. Best streaks and voice settings do not follow the player to another device.

## For parents

- There is no parent screen. A child chooses their own grade and can change it any time.
- Guests are anonymous. A child who wants to keep their progress can save their cadet (a nickname plus a Student ID); use Braylee's account for her photo and named progress.
- A guest's progress stays on the device that holds the seat and is deleted after 7 days without play; a saved cadet's progress is kept for 30 days without play.
- There is no chat or social feature, and speech runs on the device.
