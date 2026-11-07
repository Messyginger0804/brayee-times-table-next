# lib/curriculum (math)

Pure JS (no UI, DB or network) that generates and checks math practice problems for grades 1-6 from the research spec
(`docs/curriculum/math.json`, copied to `math/spec.json`; 79 skills, 254 levels). Tests: `npm test` (vitest, `tests/curriculum/`).

```js
import { getSkills, getSkill, generateProblem, checkAnswer, createRng, masteryStatus,
         getMultiplicationFacts, MULT_SETS } from 'lib/curriculum/math/index.js'; // relative path, e.g. '../../lib/curriculum/math/index.js' (no @/ alias in this repo)
```

## API

- `getSkills(grade?)` -> skills (frozen spec objects plus `grade`, `answerType`, `inputMode`). Ordered by grade then teaching `order`.
- `getSkill(id)` -> skill or `null`. Each skill has `levels[]` (`id` = `<skillId>.L<n>`), `mastery`, `name`, `teks`, `season`.
- `generateProblem(skillId, levelIndex, rng?)` -> problem. **`levelIndex` is 0-based** (`0` = `L1`); throws `RangeError` if invalid.
  Pass `createRng(seed)` for determinism; with no rng a shared random one is used. The same rng never returns the same prompt
  twice in a row per skill+level (it remembers the last one in `rng.recent`), so reuse one rng across a session.
- `checkAnswer(problem, input)` -> `{ correct, normalized, feedbackHint? }`. `input` is a string (or number). For remainder
  problems it also accepts `{ quotient, remainder }` from a two-field UI. `normalized` is the cleaned echo of what was typed
  (`null` if unparseable). Fractions keep the typed form (`6/8`), decimals/integers are canonical (`0.5`).
- `createRng(seed)` -> `{ next, int(min,max), pick, chance, shuffle, recent }` (mulberry32; seed is a number or string).
- `masteryStatus(results, skill, { requireTime = true }?)` -> `{ mastered, attempts, window, accuracyPct, qualifyingPct, target, reason }`.
  `results` are oldest-first `{ correct, seconds | ms, levelIndex? }`. Rule: last `skill.mastery.window` results (20 in the spec); a result
  qualifies only if correct AND within `secondsPerProblem`; mastered when qualifying share >= `skill.mastery.accuracyPct` (95 facts, 90 other)
  with a full window. Missing time = not within time (`requireTime:false` = accuracy only). If results carry
  `levelIndex` and `skill.levels` exists, every level must be mastered ("mastered when all levels meet it") and `byLevel[]` is returned.
  The library is generic; the app wraps it differently, see "How the app uses it" below.
- `getMultiplicationFacts({ includeZero? })` / `MULT_SETS`: the 144 `Problem` rows (1-12 x 1-12, `problem` = `"7 x 8"`,
  `answer`, `grade` 3|4, `setId`, `order`, `hard`, and the `skillId`+`levelIndex` that teaches it), in teaching order
  x2, x10, x5, x0/1, x4, x3, x9, squares 6-10, x6, x7, x8, then x11, x12. `includeZero` adds x0 facts (`inTable:false`).
  The app keeps using `Problem` rows for the six times-table skills (`g3-mult-0-1-2-5-10`, `g3-mult-3-4`, `g3-mult-9-squares`,
  `g3-mult-6-7-8`, `g3-mult-mixed`, `g4-mult-11-15`): it never plays them through the generator (`/api/math/attempt` returns 400 for them and
  `/skill/<id>` shows its "Mission not found" panel for them). Their generators still work as library functions, and `g3-div-facts` is played as a normal generated skill.

### Problem shape

```js
{ skillId, levelIndex, prompt: '3 x 7 = __', promptParts: [...], answer: '21', answerDisplay: '21',
  answerType, keypad, timeLimit /* seconds or null */, requireSimplest? /* fractions */, meta /* debug operands */ }
```

`answer` is always a **string** in canonical form: integers `"-5"`, decimals without trailing zeros (`"0.5"`),
fractions reduced and improper (`"17/12"`, or `"4"`), remainders `"26 R 1"` (`"21"` when none), symbols `"<"`, choices `"yes"`.
Show `answerDisplay` to the child (true minus sign, mixed numbers for mixed-number prompts, `5.30` for money).
`answerType`: `integer | decimal | fraction | symbol | choice | quotient_remainder`.
`prompt` is plain ASCII (`x`, `/`, `-`), good for storage/logging, like `Problem.problem`.

### Keypad flags

`keypad = { digits, minus, decimal, fractionSlash, mixedSpace, remainder, compare, yesNo, choices, maxDigits }`

| flag | UI needs |
|---|---|
| `digits` | 0-9, backspace, enter (false when the answer is a choice) |
| `minus` | unary minus key (grade 6 integers) |
| `decimal` | `.` key (decimal and money answers) |
| `fractionSlash` | `/` key; `mixedSpace` adds a space key for `1 1/2` |
| `remainder` | two fields (quotient, `R` remainder) or an `R` key; send `"q R r"` or `{quotient, remainder}` |
| `compare` | three big buttons `<` `>` `=` (`choices` is `['<','>','=']`) |
| `yesNo` | yes/no buttons (`choices` = `['yes','no']`); other choice skills give `choices` like `['even','odd']`, `['prime','composite']` |
| `maxDigits` | 7; answers never need more (grade 4 sums reach 1,000,000). Keep manual Enter for multi-digit answers |

Keypad flags are constant per skill level (not per problem), apart from remainder levels showing one field when whole.

### Rendering `promptParts`

`prompt === concatenation of every part's plain form`. Render parts left to right inline with no extra spacing; text parts carry
their own spaces. Part types:

- `{t:'text', v}`: text with display glyphs already applied (`×`, `÷`, `−`).
- `{t:'blank'}`: the answer box (`__`).
- `{t:'fraction', num, den}`: stacked fraction. `num` or `den` of `null` means that slot is an input box (`1/2 = __/4`).
- `{t:'mixed', whole, num, den}`: whole number next to a stacked fraction.
- `{t:'power', base, exp}`: superscript exponent (`base` may be a string such as `"(3 + 4)"`).
- `{t:'coin', coin: 'penny'|'nickel'|'dime'|'quarter', count}`: coin image x count (or text "2 dimes"). Money: `$` is plain text.
- Absolute value uses literal `|` characters in text parts.

## Spec deviations (judgement calls)

- `levelIndex` is 0-based; level params are interpreted per skill (the spec's `params` mix ranges and value lists).
- Back-to-back repeats are avoided; `x0`/`x1` (and `/1`, `0 /`) facts are down-weighted to ~10-20% except the dedicated x0/x1 level.
- `g1-compare` L1 has no `=` (tens differ makes equal impossible); `g3-fraction-compare` has no `=` (needs identical fractions).
- `g1-skip-count` L4 "off-zero": start is a non-zero multiple of the step. `g2-skip-count` starts are multiples of the step too.
- `g1-add-10` L1 keeps +0/+1 as specified; `g2-add-20` skips zero addends and caps sums at 18 (level name); `g2-sub-20` L2/L3 use
  minuends 11-14 / 15-18 (names), not cumulative; subtrahend >= 1.
- `g3-mult-6-7-8` excludes squares (6x6, 7x7, 8x8) per its "exclude pairs already covered" rule, so L1 pairs 3 and 4 with 6 only.
- `g3-mult-3-4` etc.: the "20% interleaved review" is a scheduler job and is not generated (only `g4-mult-11-15` L3 mixes in 20% review).
- `g3-missing-factor` answers are 2-10 (a 1 would break the product >= 4 rule). `g3-round` L3 uses n 101-999 (no rounding to 0).
- `g3-mult-0-1-2-5-10`, `g3-div-facts`: quotient 0 is rare. `g3-money-dollars` L1 is cents (integer answer, no decimal key).
- `g4-mult-11-15` L4 squares 11-15 (name) not 13-15. `g4-mult-10-100` L1/L2 use 2-99, L3 100-999.
- `g4-estimate`: round each operand to the place, then operate (matches the spec examples).
- `g4-decimals-frac` L3 asks "Which is greater" and the answer is that numeral (65% place-value traps like 0.4 vs 0.35).
- `g4-div-1digit` L3 includes ~10% remainder-0 items (answer is just the quotient; `R 0` also accepted).
- `g5-fraction-add-sub-unlike`: L2 = neither denominator a multiple of the other; L3 = mixed numbers with coprime denominators
  and `requireSimplest` (the spec put "coprime" under Level 3 and "mixed numbers" in the level list; merged).
- `g5-fraction-mult-whole` L3 and `g5-fraction-add-sub-unlike` L3 require simplest form (`requireSimplest: true`, prompt says so).
  Everywhere else equivalent fractions (improper, mixed, unreduced) are accepted, with the hint `can you simplify?` when unreduced.
- `g5-powers-of-10` L4 uses exponents 2-6. `g5-order-of-ops` uses values 2-12 (spec allowed 1-20) and guarantees the
  precedence/parentheses actually change the result.
- `g6-fraction-decimal-percent`: thirds ask "nearest whole number" (non-terminating); L1 also uses 2/5, 3/5, 4/5, 7/10, 9/10;
  L3 mixes eighths as percent (12.5) or decimal (0.125).
- `g6-percent-of`: ~80% clean integer results, ~20% terminating decimals. `g6-one-step-equations` L3 answers reach 144 (p x q);
  decimal/fraction solutions are not generated. `g6-div-multi-digit` L3 quotients terminate within 2 decimals.
- `g1-coins` / `g2-money-cents`: spec `count` is read as total coins (2-5 / 3-6); the newest coin appears in ~70% of items.

## How the app uses it

- The app passes `createRng` seeded with the current time once per mission session and calls `generateProblem(skillId, levelIndex, rng)`; the browser checks with
  `checkAnswer` for instant feedback and the server (`POST /api/math/attempt`) judges again with `checkAnswer`.
- Progress is one `MathSkillProgress` row per `(userId, skillId)` with `levelIndex` as a column and a rolling `recent` window of `{ c, ms }`
  for the current level. Each answer is also stored in `MathAttempt` (with `levelIndex`). It is not keyed by level.
- Mastery in the app does not call `masteryStatus` with `levelIndex`, so `byLevel` mode is unused. `lib/mathSkills.js` `evaluateWindow` calls it on the stored window:
  - not the last level: the last 10 attempts (`LEVEL_ADVANCE_WINDOW`) with `window: 10` and the skill's `accuracyPct` and `secondsPerProblem` decide the level-up (95% skills need 10 of 10, 90% skills 9 of 10), and the window is cleared on level-up;
  - last level: the last `mastery.window` attempts (20) decide mastery (95% = 19 of 20, 90% = 18 of 20).
  The difference from the spec's single 20-problem rule was resolved in favour of the code; see [docs/curriculum/math.md](../../docs/curriculum/math.md).
- `secondsPerProblem` is enforced only here, from the measured `ms` of each attempt (capped at 10 minutes). Testing mode is the times-table drill and has no timer.
- `timeLimit` is set only for `g3-mult-mixed` L2/L3 (5 s, 3 s) and the UI only prints "Try for N seconds" (no countdown); that skill is one of the six `Problem`-backed skills, so it is not played through the generator in the app.
- `Keypad` in the UI accepts up to `maxDigits + 6` characters, leaving room for `/`, spaces, `R` and a minus sign.

## Integration notes

- Store answers as text; keep `Problem`/`UserProblem` for the 12x12 facts.
- Tests recompute every answer independently from the prompt text, so prompt strings are part of the contract; changing a
  prompt format needs the oracle in `tests/curriculum/helpers.js` updated.
