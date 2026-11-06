# Braylee's Times Tables: Math curriculum by grade (1-6)

Generated 2026-11-06. Texas TEKS first, Common Core (CCSS) cross-referenced. Machine-readable twin: `math.json` (same content, generated from the same data).

## Contents
1. How to read this document and the JSON schema
2. Recommendations: mapping app levels to grades
3. Fact-fluency research and targets
4. Grades 1-6 skill lists
5. Keypad and UI needs
6. Sources and licenses
7. Gaps and open decisions

## 1. How to read this document and the JSON schema

- TEKS codes: `grade.strand letter`, e.g. `3.4F`. A trailing `?` means the code is inferred and not confirmed in the text read; in JSON that is `verified:false`.
- Season: fall = Aug-Nov, winter = Dec-Feb, spring = Mar-May (Texas school year). Order within a grade follows IM K-5 unit order and typical Texas pacing. Bluebonnet pacing was not retrievable.
- Mastery: `accuracy over the last 20 problems` and `seconds per problem` including keypad entry.
- Examples use plain `x` and `/`; stored problem text should follow the existing `Problem.problem` style (`7 x 8`).

### JSON schema (math.json)

```text
root: { schemaVersion, app, generatedOn, seasonDefinition{fall,winter,spring}, standardsBasis,
        answerTypes[], fieldDocs{}, gradeMapping{}, keypadNeeds[], researchNotes[], grades[], sources[] }
grades[]:  { grade:1-6, label, age, texasFluencyNote, timesTables, skills[], outOfScope[{topic,adaptation}] }
skills[]:  { id:'g3-div-facts', order:int, name, teks:[{code,verified}], ccss:[string], description,
             season:['fall'|'winter'|'spring'], generator, examples:[{prompt,answer} x3],
             mastery:{accuracyPct,secondsPerProblem,window,note?}, levels[], keypad[] }
generator: { operation, operands:{name:{min,max}|{values:[..]}|{...,decimals:n}}, constraints:[string],
             answerType, inputMode:'keypad'|'choice:...'|'two-field:quotient,remainder' }
levels[]:  { id:'<skillId>.L<n>', order:int (difficulty ascending), name, params:{partial overrides of generator} }
```

Rules: `levels[].params` override or narrow `generator.operands`; absent keys inherit. `constraints` are plain-English rules for the generator author (v1); `operation` is a free string key, so the engine needs one handler per distinct `operation` value.

## 2. Recommendations: mapping app levels to grades

Grade is a recommended starting band, not a gate. A child picks (or a parent sets) a grade; inside it, skills unlock in `order`. Children can jump to any grade.

- Level = one skill's sub-level (skillId.Ln). Do not reuse the current integer User.level for this; keep it as the XP/star level and add per-skill progress.
- Unlock next skill when previous skill mastery (accuracyPct, secondsPerProblem) is met on the last 20 problems; allow parent override.
- Interleave 20% review from earlier skills and grades (spaced repetition) in Practice/Testing.
- Mode mapping: Memorize = show answer first then recall (levels with new facts); Practice = untimed or soft-timed with feedback; Testing = timed at secondsPerProblem; Spelling Bee unchanged.

### Where the existing 12x12 times tables fit

Local read-only DB check: `Problem` has 144 rows (answers 1-144), `UserProblem` 413 rows, `User.level` int, and `Problem.answer` is an integer column.

- grade1: Prerequisite only (skip counting by 2/5/10).
- grade2: Equal groups/arrays to 5x5.
- grade3: Core: 100 of 144 existing Problem rows (both factors 1-10) plus x0 facts; recommended order x2,x10,x5,x0/1, x4,x3, x9 and squares, x6/x7/x8; division facts follow each set.
- grade4: Remaining 44 rows (a factor of 11 or 12) and squares to 15x15.
- grades5and6: Review only, resurfaced through spaced repetition and as sub-skills of other problems.

Data notes:
- Problem: 144 rows (id, problem text like '1 x 1' with lowercase x, answer integer, correct, incorrect, mastered). UserProblem(userId, problemId, everCorrect, updatedAt, mastered) composite PK. User.level integer default 1. 413 UserProblem rows locally.
- Answer is an integer column: cannot store fractions, decimals, remainders or symbols.
- Per-user mastery already exists for the 144 table rows; new skills are generated on the fly, so mastery must be keyed by (userId, skillId, level) and, for fact skills, optionally (a,b) pairs.

Suggested persistence: Add Skill progress table (userId, skillId, levelOrder, attempts, correct, recentWindow json, masteredAt) and store answers as text with answerType; keep Problem/UserProblem untouched for tables and map grade 3/4 skills to them via a (a,b) key. Generated items do not need rows.

## 3. Fact-fluency research and targets

- Accuracy target: 90% for computation skills, 95% for fact-recall skills (counting, facts, comparisons). Chosen as a design default; TEKS/CCSS give no numeric thresholds.
- Speed: about 3 s per recalled single-digit fact (retrieval) is the widely used 'automatic' criterion; this includes typing a 1-2 digit answer, so 3 s is a strict but standard target. Multi-step procedures get longer budgets scaled to the number of digit operations.
- Strategy order for addition/subtraction: counting/+0/+1, doubles, make-ten (+9, +8), near doubles, then the rest; subtraction follows as the inverse (Baroody-style reasoning-strategy framework; seen via secondary sources).
- Strategy order for multiplication: x2, x10, x5 first (skip counting; the NCTM-linked Georgia document places 2s/5s/10s first), then x0/x1, x4 (double double), x3, x9, squares, finally x6/x7/x8 (6x7, 6x8, 7x8 are the hardest). Division facts are taught right after the matching multiplication set.
- A 2015 study cited in search results found a strategy-based approach produced steadier multiplication-fact gains than repetition drills alone: combine Memorize (strategy shown) with Practice/Testing (retrieval).

## 4. Grades 1-6 skill lists

| Grade | Skills |
|---|---|
| 1 | 12 |
| 2 | 12 |
| 3 | 16 |
| 4 | 14 |
| 5 | 12 |
| 6 | 13 |

### Grade 1 (1st grade, ages 6-7)

**Fluency standards:** In the 2012 TEKS text read for this spec, 1.3D is the within-20 fact-strategy SE (make 10, decompose to 10). 1.3F is 'create and solve problem situations from a number sentence', not a fluency SE. CCSS 1.OA.C.6 is the true fluency target (add/subtract within 10 fluently, within 20 with strategies).

**Times tables:** None. Skip-counting by 2, 5, 10 (1.5B) is the on-ramp to x2, x5, x10.

#### 1.1 Count forward and back (to 120) (`g1-count-seq`)

- TEKS: 1.5A  |  CCSS: 1.NBT.A.1, K.CC.A.1
- Description: Say what comes before/after a number and fill a missing number in a counting sequence up to 120.
- When: fall
- Generator: operation `successor_predecessor`; operands `{"n":{"min":1,"max":120}}`; answer type `integer`; input `keypad`
- Constraints: Missing term is first, middle or last of a 3-term run
- Examples: `What comes after 47?` = 48; `What comes before 100?` = 99; `39, 40, __` = 41
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. 1-20 `{"n":[1,20]}`
  2. 1-50 `{"n":[1,50]}`
  3. 1-120 incl. crossing 100 `{"n":[1,120],"crossHundred":true}`

#### 1.2 Skip count by 2s, 5s, 10s (`g1-skip-count`)

- TEKS: 1.5B  |  CCSS: 2.NBT.A.2?, 1.NBT.A.1
- Description: Give the next number when counting by 2, 5 or 10 (up to 120). Foundation for x2/x5/x10 facts.
- When: fall/winter
- Generator: operation `next_in_skip_sequence`; operands `{"step":{"values":[10,5,2]},"start":{"min":0,"max":100},"shown":3}`; answer type `integer`; input `keypad`
- Constraints: start is a multiple of step; next term <= 120
- Examples: `2, 4, 6, __` = 8; `5, 10, 15, __` = 20; `60, 70, 80, __` = 90
- Mastery: >= 90% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. by 10 `{"step":[10]}`
  2. by 5 `{"step":[5]}`
  3. by 2 `{"step":[2]}`
  4. mixed, start off-zero `{"step":[2,5,10],"offsetStart":true}`

#### 1.3 10 more / 10 less (`g1-ten-more-less`)

- TEKS: 1.5C  |  CCSS: 1.NBT.C.5
- Description: Mentally find the number 10 more or 10 less than a number up to 120.
- When: fall
- Generator: operation `add_sub_ten`; operands `{"n":{"min":0,"max":120}}`; answer type `integer`; input `keypad`
- Constraints: 10 less never below 0
- Examples: `10 more than 34` = 44; `10 less than 82` = 72; `10 more than 99` = 109
- Mastery: >= 95% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. within 100, no crossing a hundred `{"n":[0,99],"crossHundred":false}`
  2. within 120 incl. 99 -> 109 `{"n":[0,120],"crossHundred":true}`

#### 1.4 Tens and ones (`g1-place-value`)

- TEKS: 1.2B, 1.2C  |  CCSS: 1.NBT.B.2
- Description: Read a number as tens and ones and write the number (to 99, then 120).
- When: fall
- Generator: operation `compose_decompose_place_value`; operands `{"tens":{"min":1,"max":9},"ones":{"min":0,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: Prompt forms: 'T tens O ones', 'T0 + O', 'how many tens in N'
- Examples: `4 tens 7 ones = __` = 47; `60 + 5 = __` = 65; `How many tens in 83?` = 8
- Mastery: >= 90% over last 20, <= 5 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. tens and ones, 11-99 with ones != 0 `{"max":99}`
  2. expanded form `{"expanded":true}`
  3. include 100-120 `{"max":120}`

#### 1.5 Compare two-digit numbers (`g1-compare`)

- TEKS: 1.2E, 1.2G  |  CCSS: 1.NBT.B.3
- Description: Choose <, > or = for two numbers up to 100.
- When: fall/winter
- Generator: operation `compare`; operands `{"a":{"min":0,"max":100},"b":{"min":0,"max":100}}`; answer type `symbol`; input `choice:<,>,=`
- Constraints: Include ~15% equal pairs; Level 1 tens digits differ; level 2 same tens digit
- Examples: `45 _ 54` = <; `71 _ 17` = >; `30 _ 30` = =
- Mastery: >= 95% over last 20, <= 4 s each
- Keypad: choice-symbols
- Sub-levels (easy to hard):
  1. tens digits differ `{"sameTens":false}`
  2. same tens, ones differ `{"sameTens":true}`
  3. mixed `{}`

#### 1.6 Addition facts within 10 (`g1-add-10`)

- TEKS: 1.3D  |  CCSS: 1.OA.C.6
- Description: Recall sums with total <= 10. Ordered by strategy: +0/+1, doubles, sums to 5, make 10.
- When: fall
- Generator: operation `add`; operands `{"a":{"min":0,"max":10},"b":{"min":0,"max":10}}`; answer type `integer`; input `keypad`
- Constraints: a + b <= 10
- Examples: `3 + 4` = 7; `5 + 5` = 10; `0 + 8` = 8
- Mastery: >= 95% over last 20, <= 3 s each (Target ~3 s recall (Baroody-style convention; see sources).)
- Keypad: digits
- Sub-levels (easy to hard):
  1. +0 and +1 `{"b":[0,1]}`
  2. doubles to 5+5 `{"doubles":true,"max":5}`
  3. sums to 5 `{"sumMax":5}`
  4. sums to 10 (make-10 pairs first) `{"sumMax":10,"pairsToTenFirst":true}`

#### 1.7 Subtraction facts within 10 (`g1-sub-10`)

- TEKS: 1.3D  |  CCSS: 1.OA.C.6
- Description: Recall differences from totals <= 10, linked to addition partners.
- When: fall/winter
- Generator: operation `sub`; operands `{"minuend":{"min":0,"max":10},"subtrahend":{"min":0,"max":10}}`; answer type `integer`; input `keypad`
- Constraints: subtrahend <= minuend
- Examples: `9 - 4` = 5; `10 - 7` = 3; `6 - 6` = 0
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. from 5 or less `{"minuendMax":5}`
  2. from 10 or less `{"minuendMax":10}`
  3. -0, -1, -all, think-addition mix `{"mix":true}`

#### 1.8 Addition facts within 20 (`g1-add-20`)

- TEKS: 1.3C, 1.3D  |  CCSS: 1.OA.C.6
- Description: Recall sums 11-20 using make-ten, doubles and near-doubles strategies.
- When: winter
- Generator: operation `add`; operands `{"a":{"min":2,"max":9},"b":{"min":2,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: 11 <= a + b <= 20; Order of levels follows strategy: doubles, +9/make-ten, near doubles, rest
- Examples: `9 + 6` = 15; `7 + 7` = 14; `8 + 5` = 13
- Mastery: >= 90% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. doubles 6+6..9+9 `{"doubles":true}`
  2. +9 and +8 (make ten) `{"b":[8,9]}`
  3. near doubles (n + n+1) `{"nearDoubles":true}`
  4. all remaining `{}`

#### 1.9 Subtraction facts within 20 (`g1-sub-20`)

- TEKS: 1.3D  |  CCSS: 1.OA.C.6
- Description: Subtract within 20 by counting back to 10 or thinking of the missing addend.
- When: winter/spring
- Generator: operation `sub`; operands `{"minuend":{"min":11,"max":20},"subtrahend":{"min":2,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: difference >= 2; Level 1 is the inverse of doubles
- Examples: `15 - 6` = 9; `14 - 7` = 7; `12 - 3` = 9
- Mastery: >= 90% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. inverse doubles (12-6, 14-7) `{"inverseDoubles":true}`
  2. subtract 9 or 8 `{"subtrahend":[8,9]}`
  3. all remaining `{}`

#### 1.10 Find the missing number (`g1-missing-number`)

- TEKS: 1.5F, 1.5E  |  CCSS: 1.OA.D.8, 1.OA.D.7
- Description: Find the unknown in an addition or subtraction equation within 20.
- When: winter/spring
- Generator: operation `missing_term`; operands `{"total":{"min":2,"max":20},"known":{"min":1,"max":19}}`; answer type `integer`; input `keypad`
- Constraints: Unknown can be any position (a+_=c, _+b=c, c-_=a, _-b=a); All terms within 20
- Examples: `7 + __ = 12` = 5; `__ + 4 = 13` = 9; `15 - __ = 8` = 7
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. within 10, unknown is a term after the + `{"max":10,"position":"addend2"}`
  2. within 10, any position `{"max":10}`
  3. within 20, any position `{"max":20}`

#### 1.11 Add and subtract tens (`g1-add-sub-tens`)

- TEKS: 1.3A  |  CCSS: 1.NBT.C.4, 1.NBT.C.6
- Description: Add/subtract multiples of 10 and add a one-digit number to a two-digit number with no regrouping.
- When: spring/winter
- Generator: operation `add_sub_tens_ones`; operands `{"a":{"min":10,"max":90},"b":{"min":1,"max":90}}`; answer type `integer`; input `keypad`
- Constraints: Level 1-2: tens only (multiples of 10); Level 3: two-digit + one-digit, ones sum <= 9 (no regrouping); results within 100
- Examples: `30 + 20` = 50; `50 - 20` = 30; `34 + 5` = 39
- Mastery: >= 90% over last 20, <= 5 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. multiple of 10 + multiple of 10 `{"tensOnly":true,"op":"add"}`
  2. multiple of 10 - multiple of 10 `{"tensOnly":true,"op":"sub"}`
  3. 2-digit + 1-digit, no regrouping `{"noRegroup":true}`

#### 1.12 Count coins (pennies, nickels, dimes, quarters) (`g1-coins`)

- TEKS: 1.4A, 1.4C  |  CCSS: 2.MD.C.8
- Description: Total value in cents of a small set of coins. (CCSS puts coins in grade 2; Texas starts them in grade 1.)
- When: spring/winter
- Generator: operation `coin_total`; operands `{"coins":{"types":["penny","nickel","dime","quarter"]},"count":{"min":2,"max":5}}`; answer type `integer`; input `keypad`
- Constraints: Level 1 coins of one kind or dimes+pennies; total <= 100 cents
- Examples: `2 dimes + 3 pennies = __ cents` = 23; `1 quarter + 1 dime = __ cents` = 35; `4 nickels = __ cents` = 20
- Mastery: >= 90% over last 20, <= 8 s each (Prompt uses coin pictures or words; answer is cents.)
- Keypad: digits
- Sub-levels (easy to hard):
  1. dimes and pennies `{"coins":["dime","penny"]}`
  2. add nickels `{"coins":["dime","nickel","penny"]}`
  3. add quarters, total <= 100 `{"coins":["quarter","dime","nickel","penny"]}`

**Out of scope / adaptations (grade 1):**
- Halves and fourths of shapes (1.6G, 1.6H; 1.G.A.3): 'Half of 8' / 'Fourth of 12' as integer answers once skip counting is mastered.
- Data displays, measurement with units, time to the hour/half-hour, 2D/3D shape attributes: Out of scope. 'How many minutes in a half hour' style recall (30) is the only drillable bit.
- Word problems (1.3B, 1.OA.A): Short story problems could reuse g1-add/sub generators with a text template; needs reading support.

### Grade 2 (2nd grade, ages 7-8)

**Fluency standards:** TEKS 2.4A: quickly recall addition and subtraction facts within 20 (2012 text). TEKS 2.4B: add up to four 2-digit numbers and subtract 2-digit numbers mentally/with place value. CCSS 2.OA.B.2 and 2.NBT.B.5 are the fluency standards.

**Times tables:** Foundation only: equal groups and arrays to 5x5 (CCSS 2.OA.C.4); skip counting by 2, 5, 10, 100. Several US programs introduce x2/x5/x10 in late grade 2 (NCTM-linked Georgia doc, see sources).

#### 2.1 Addition facts within 20 (automatic) (`g2-add-20`)

- TEKS: 2.4A  |  CCSS: 2.OA.B.2
- Description: Know all sums of two one-digit numbers from memory.
- When: fall
- Generator: operation `add`; operands `{"a":{"min":0,"max":10},"b":{"min":0,"max":10}}`; answer type `integer`; input `keypad`
- Constraints: Includes all pairs 0-10 + 0-10, weighted toward sums 11-18
- Examples: `8 + 7` = 15; `9 + 9` = 18; `6 + 8` = 14
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. sums within 10 (review) `{"sumMax":10}`
  2. doubles and near doubles `{"nearDoubles":true,"doubles":true}`
  3. make-ten (+8, +9) `{"b":[8,9]}`
  4. all pairs to 18 `{}`

#### 2.2 Subtraction facts within 20 (automatic) (`g2-sub-20`)

- TEKS: 2.4A  |  CCSS: 2.OA.B.2
- Description: Know all differences from totals up to 18 from memory (inverse of addition facts).
- When: fall
- Generator: operation `sub`; operands `{"minuend":{"min":0,"max":18},"subtrahend":{"min":0,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: subtrahend <= minuend
- Examples: `13 - 5` = 8; `17 - 9` = 8; `18 - 9` = 9
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. within 10 `{"minuendMax":10}`
  2. 11-14 minuends `{"minuendMax":14}`
  3. 15-18 minuends `{"minuendMax":18}`

#### 2.3 Hundreds, tens, ones (`g2-place-value`)

- TEKS: 2.2A, 2.2B  |  CCSS: 2.NBT.A.1, 2.NBT.A.3
- Description: Read, write and decompose numbers to 1,000 (Texas goes to 1,200).
- When: fall
- Generator: operation `compose_decompose_place_value`; operands `{"hundreds":{"min":1,"max":9},"tens":{"min":0,"max":9},"ones":{"min":0,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: Include zeros in tens/ones places in later levels
- Examples: `3 hundreds 4 tens 6 ones = __` = 346; `400 + 70 + 2 = __` = 472; `Digit in the tens place of 583?` = 8
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no zeros `{"zeros":false}`
  2. with zeros (305, 470) `{"zeros":true}`
  3. digit value ('value of 6 in 862') `{"digitValue":true}`

#### 2.4 Compare numbers to 1,000 (`g2-compare-1000`)

- TEKS: 2.2D  |  CCSS: 2.NBT.A.4
- Description: Choose <, > or = for two 3-digit numbers.
- When: fall
- Generator: operation `compare`; operands `{"a":{"min":100,"max":999},"b":{"min":100,"max":999}}`; answer type `symbol`; input `choice:<,>,=`
- Constraints: Levels: hundreds differ, then tens differ, then ones differ
- Examples: `346 _ 364` = <; `710 _ 701` = >; `999 _ 999` = =
- Mastery: >= 95% over last 20, <= 5 s each
- Keypad: choice-symbols
- Sub-levels (easy to hard):
  1. hundreds differ `{"differAt":"hundreds"}`
  2. tens differ `{"differAt":"tens"}`
  3. ones differ / equal `{"differAt":"ones"}`

#### 2.5 Skip count by 5s, 10s, 100s (`g2-skip-count`)

- TEKS: 2.6?  |  CCSS: 2.NBT.A.2
- Description: Next term in a skip-counting sequence; bridge to multiplication.
- When: fall/winter
- Generator: operation `next_in_skip_sequence`; operands `{"step":{"values":[5,10,100,2,3,4]},"start":{"min":0,"max":900},"shown":3}`; answer type `integer`; input `keypad`
- Constraints: Terms stay <= 1,000
- Examples: `5, 10, 15, __` = 20; `100, 200, 300, __` = 400; `30, 40, 50, __` = 60
- Mastery: >= 90% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. by 10 and 100 `{"step":[10,100]}`
  2. by 5 `{"step":[5]}`
  3. by 2, then 3 and 4 within 40 `{"step":[2,3,4],"max":40}`

#### 2.6 Add two-digit numbers (`g2-add-2digit`)

- TEKS: 2.4B  |  CCSS: 2.NBT.B.5, 2.NBT.B.6
- Description: Mental/written addition of 2-digit numbers; up to four addends.
- When: fall/winter
- Generator: operation `add`; operands `{"addends":{"count":[2,4],"min":10,"max":99}}`; answer type `integer`; input `keypad`
- Constraints: Sum <= 200 (level 3-4: <= 100 for 3+ addends); Regrouping controlled by level
- Examples: `32 + 45` = 77; `28 + 47` = 75; `19 + 24 + 31` = 74
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no regrouping `{"regroup":"none"}`
  2. regroup ones `{"regroup":"ones"}`
  3. three addends `{"count":3}`
  4. four addends `{"count":4}`

#### 2.7 Subtract two-digit numbers (`g2-sub-2digit`)

- TEKS: 2.4B  |  CCSS: 2.NBT.B.5
- Description: Subtract 2-digit from 2-digit; regrouping introduced after no-regroup mastery.
- When: winter
- Generator: operation `sub`; operands `{"minuend":{"min":20,"max":99},"subtrahend":{"min":10,"max":98}}`; answer type `integer`; input `keypad`
- Constraints: difference >= 0; Regrouping controlled by level
- Examples: `68 - 25` = 43; `72 - 38` = 34; `90 - 47` = 43
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no regrouping `{"regroup":"none"}`
  2. regroup (borrow) from tens `{"regroup":"borrow"}`
  3. from multiples of 10 (80-37) `{"minuendMultipleOf10":true}`

#### 2.8 Mentally 10 or 100 more/less (`g2-mental-10-100`)

- TEKS: 2.4C?  |  CCSS: 2.NBT.B.8
- Description: Add or subtract 10 or 100 from a 3-digit number without writing.
- When: winter
- Generator: operation `add_sub_ten_hundred`; operands `{"n":{"min":100,"max":900},"delta":{"values":[10,100]}}`; answer type `integer`; input `keypad`
- Constraints: Result within 0-1,000
- Examples: `356 + 10` = 366; `482 - 100` = 382; `590 + 10` = 600
- Mastery: >= 95% over last 20, <= 5 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. +/- 100 `{"delta":[100]}`
  2. +/- 10, no crossing hundred `{"delta":[10],"crossHundred":false}`
  3. +/- 10 crossing hundred `{"delta":[10],"crossHundred":true}`

#### 2.9 Add within 1,000 (`g2-add-1000`)

- TEKS: 2.4C  |  CCSS: 2.NBT.B.7
- Description: 3-digit addition using place value, with regrouping introduced gradually.
- When: spring/winter
- Generator: operation `add`; operands `{"a":{"min":100,"max":900},"b":{"min":10,"max":900}}`; answer type `integer`; input `keypad`
- Constraints: Sum <= 1,000
- Examples: `300 + 400` = 700; `246 + 132` = 378; `358 + 276` = 634
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. multiples of 100 `{"multipleOf":100}`
  2. no regrouping `{"regroup":"none"}`
  3. regroup once `{"regroup":"once"}`
  4. regroup twice `{"regroup":"twice"}`

#### 2.10 Subtract within 1,000 (`g2-sub-1000`)

- TEKS: 2.4C  |  CCSS: 2.NBT.B.7
- Description: 3-digit subtraction using place value; regrouping introduced gradually.
- When: spring
- Generator: operation `sub`; operands `{"minuend":{"min":200,"max":999},"subtrahend":{"min":10,"max":900}}`; answer type `integer`; input `keypad`
- Constraints: difference >= 0
- Examples: `800 - 300` = 500; `587 - 243` = 344; `452 - 178` = 274
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. multiples of 100 `{"multipleOf":100}`
  2. no regrouping `{"regroup":"none"}`
  3. regroup once `{"regroup":"once"}`
  4. regroup twice / across zero (500-267) `{"regroup":"twice"}`

#### 2.11 Coin totals to $1 (`g2-money-cents`)

- TEKS: 2.5A, 2.5B  |  CCSS: 2.MD.C.8
- Description: Total cents for up to ~6 mixed coins.
- When: spring
- Generator: operation `coin_total`; operands `{"coins":{"types":["penny","nickel","dime","quarter"]},"count":{"min":3,"max":6}}`; answer type `integer`; input `keypad`
- Constraints: total <= 100 cents
- Examples: `2 quarters + 1 dime + 3 pennies = __ cents` = 63; `3 dimes + 2 nickels = __ cents` = 40; `1 quarter + 4 nickels = __ cents` = 45
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. dimes, nickels, pennies `{"coins":["dime","nickel","penny"]}`
  2. add quarters `{"coins":["quarter","dime","nickel","penny"]}`
  3. answer as $0.xx `{"answerFormat":"decimal-dollars"}`

#### 2.12 Equal groups and arrays (x intro) (`g2-equal-groups`)

- TEKS: 2.6A?  |  CCSS: 2.OA.C.4, 2.OA.C.3
- Description: Repeated addition and rows x columns up to 5 x 5; first contact with x2, x5, x10.
- When: spring
- Generator: operation `repeated_addition_array`; operands `{"groups":{"min":2,"max":5},"size":{"values":[2,5,10,3,4]}}`; answer type `integer`; input `keypad`
- Constraints: Show as 'n groups of k', 'k + k + k', or an array picture
- Examples: `3 + 3 + 3 + 3` = 12; `5 groups of 2` = 10; `3 rows of 5` = 15
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. groups of 2 `{"size":[2]}`
  2. groups of 5 and 10 `{"size":[5,10]}`
  3. groups of 3 and 4, up to 5 groups `{"size":[3,4]}`

**Out of scope / adaptations (grade 2):**
- Rounding (not in 2012 TEKS grade 2 per text read); data/graphs; measurement; 2D/3D geometry; telling time to 5 min: Time: 'minutes after the hour' from a clock image could be drilled; needs images.
- Fractions halves/fourths/eighths (2.3; 2.G.A.3): 'How many fourths make a whole?' (4) as integer; 'half of 16' (8).

### Grade 3 (3rd grade, ages 8-9)

**Fluency standards:** TEKS 3.4F: recall facts to multiply up to 10 by 10 with automaticity and recall the corresponding division facts. 3.4A: fluently add/subtract within 1,000. CCSS 3.OA.C.7 (multiply/divide within 100, know single-digit products from memory by end of grade) and 3.NBT.A.2 (add/subtract within 1,000).

**Times tables:** CORE GRADE FOR THE EXISTING TABLES. Rows of the Problem table where both factors are 1-10 (100 of 144 rows) are grade 3. Add x0 (not in the table) and division facts. Rows with a factor of 11 or 12 (44 rows) are grade 4 enrichment.

#### 3.1 Round to nearest 10 or 100 (`g3-round`)

- TEKS: 3.4B  |  CCSS: 3.NBT.A.1
- Description: Round numbers up to 1,000 to the nearest 10 or 100.
- When: fall
- Generator: operation `round`; operands `{"n":{"min":11,"max":999},"place":{"values":[10,100]}}`; answer type `integer`; input `keypad`
- Constraints: Include midpoint values (x5 -> up, 50 -> 100 for hundreds)
- Examples: `Round 47 to the nearest 10` = 50; `Round 463 to the nearest 100` = 500; `Round 850 to the nearest 100` = 900
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. nearest 10, 2-digit `{"place":10,"max":99}`
  2. nearest 10, 3-digit `{"place":10,"max":999}`
  3. nearest 100 `{"place":100}`

#### 3.2 Add within 1,000 (fluent) (`g3-add-1000`)

- TEKS: 3.4A  |  CCSS: 3.NBT.A.2
- Description: Add 3-digit numbers fluently including regrouping.
- When: fall
- Generator: operation `add`; operands `{"a":{"min":100,"max":900},"b":{"min":100,"max":900}}`; answer type `integer`; input `keypad`
- Constraints: sum <= 1,000
- Examples: `254 + 138` = 392; `467 + 285` = 752; `599 + 247` = 846
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no regrouping `{"regroup":"none"}`
  2. regroup once `{"regroup":"once"}`
  3. regroup twice or carry across 9s `{"regroup":"twice"}`

#### 3.3 Subtract within 1,000 (fluent) (`g3-sub-1000`)

- TEKS: 3.4A  |  CCSS: 3.NBT.A.2
- Description: Subtract 3-digit numbers fluently including borrowing across zeros.
- When: fall
- Generator: operation `sub`; operands `{"minuend":{"min":200,"max":999},"subtrahend":{"min":100,"max":900}}`; answer type `integer`; input `keypad`
- Constraints: difference >= 0
- Examples: `637 - 214` = 423; `500 - 267` = 233; `842 - 579` = 263
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no regrouping `{"regroup":"none"}`
  2. borrow once `{"regroup":"once"}`
  3. borrow twice / across zero `{"regroup":"twice"}`

#### 3.4 Multiplication: x0, x1, x2, x5, x10 (`g3-mult-0-1-2-5-10`)

- TEKS: 3.4D, 3.4E, 3.4F  |  CCSS: 3.OA.A.1, 3.OA.C.7
- Description: Easiest facts first: skip-count based and identity/zero facts. Commutative partners count as the same fact.
- When: fall
- Generator: operation `mul`; operands `{"a":{"min":0,"max":10},"b":{"values":[0,1,2,5,10]}}`; answer type `integer`; input `keypad`
- Constraints: Present either order (a x b or b x a); Matches rows of existing Problem table where a factor is 1, 2, 5 or 10
- Examples: `6 x 2` = 12; `7 x 5` = 35; `10 x 9` = 90
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x2 (doubles) `{"b":[2]}`
  2. x10 `{"b":[10]}`
  3. x5 `{"b":[5]}`
  4. x0 and x1 `{"b":[0,1]}`
  5. mix of the five `{"b":[0,1,2,5,10]}`

#### 3.5 Multiplication: x3, x4 (`g3-mult-3-4`)

- TEKS: 3.4F  |  CCSS: 3.OA.C.7
- Description: x4 as double-double; x3 as double plus one more group.
- When: fall/winter
- Generator: operation `mul`; operands `{"a":{"min":1,"max":10},"b":{"values":[3,4]}}`; answer type `integer`; input `keypad`
- Constraints: Interleave 20% review from earlier fact sets
- Examples: `3 x 7` = 21; `4 x 8` = 32; `4 x 6` = 24
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x4 `{"b":[4]}`
  2. x3 `{"b":[3]}`
  3. x3 and x4 mixed `{"b":[3,4]}`

#### 3.6 Multiplication: x9 and squares (`g3-mult-9-squares`)

- TEKS: 3.4F  |  CCSS: 3.OA.C.7, 3.OA.D.9
- Description: x9 via ten-minus-one pattern; square facts 6x6..10x10 as anchors.
- When: winter
- Generator: operation `mul`; operands `{"a":{"min":1,"max":10},"b":{"values":[9]},"squares":{"min":6,"max":10}}`; answer type `integer`; input `keypad`
- Constraints: Level 2 squares only: n x n for n 6-10
- Examples: `9 x 6` = 54; `7 x 7` = 49; `9 x 9` = 81
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x9 `{"b":[9]}`
  2. squares 6x6..10x10 `{"squaresOnly":true}`
  3. x9 + squares mixed `{}`

#### 3.7 Multiplication: x6, x7, x8 (`g3-mult-6-7-8`)

- TEKS: 3.4F  |  CCSS: 3.OA.C.7
- Description: Hardest facts last; only the unfamiliar ones remain (6x7, 6x8, 7x8 and mirrors).
- When: winter
- Generator: operation `mul`; operands `{"a":{"min":6,"max":8},"b":{"min":6,"max":8}}`; answer type `integer`; input `keypad`
- Constraints: Exclude pairs already covered by earlier levels (x2,x5,x10,x9,squares); remaining unique facts are 6x7, 6x8, 7x8 and x6/x7/x8 with 3 and 4
- Examples: `6 x 7` = 42; `8 x 7` = 56; `8 x 6` = 48
- Mastery: >= 95% over last 20, <= 3 s each (Spend most spaced repetition here; 6x7, 6x8, 7x8 are the usual last holdouts.)
- Keypad: digits
- Sub-levels (easy to hard):
  1. x6 with 3,4,6 `{"b":[6],"a":[3,4,6]}`
  2. x7 with 3,4,6,7 `{"b":[7],"a":[3,4,6,7]}`
  3. x8 with 3,4,6,7,8 `{"b":[8],"a":[3,4,6,7,8]}`
  4. 6x7, 6x8, 7x8 only `{"hardOnly":true}`

#### 3.8 Multiplication: full 10 x 10 (automatic) (`g3-mult-mixed`)

- TEKS: 3.4F  |  CCSS: 3.OA.C.7
- Description: All 0-10 products, random order, timed. This is the existing app drill capped at 10.
- When: spring
- Generator: operation `mul`; operands `{"a":{"min":0,"max":10},"b":{"min":0,"max":10}}`; answer type `integer`; input `keypad`
- Constraints: Existing Problem rows 1x1..10x10 (+ x0 added)
- Examples: `8 x 9` = 72; `10 x 10` = 100; `0 x 6` = 0
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. untimed, accuracy first `{"timed":false}`
  2. timed 5 s `{"timeLimit":5}`
  3. timed 3 s (mastery) `{"timeLimit":3}`

#### 3.9 Division facts (inverse of x) (`g3-div-facts`)

- TEKS: 3.4F, 3.4J, 3.4H  |  CCSS: 3.OA.C.7, 3.OA.B.6
- Description: Divide within 100 by a one-digit divisor with whole-number quotient; follows the same grouping as multiplication.
- When: winter/spring
- Generator: operation `div`; operands `{"divisor":{"min":1,"max":10},"quotient":{"min":0,"max":10}}`; answer type `integer`; input `keypad`
- Constraints: dividend = divisor x quotient (<= 100); Divisor never 0; Introduce a division fact set only after its multiplication set is mastered
- Examples: `18 / 3` = 6; `56 / 7` = 8; `81 / 9` = 9
- Mastery: >= 95% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. divisors 2, 5, 10 `{"divisor":[2,5,10]}`
  2. divisors 3, 4 `{"divisor":[3,4]}`
  3. divisors 9 and squares `{"divisor":[9]}`
  4. divisors 6, 7, 8 `{"divisor":[6,7,8]}`
  5. mixed 1-10 `{}`

#### 3.10 Missing factor (`g3-missing-factor`)

- TEKS: 3.4J, 3.4K  |  CCSS: 3.OA.A.4, 3.OA.B.6
- Description: Find the unknown factor; links multiplication to division.
- When: winter
- Generator: operation `missing_factor`; operands `{"known":{"min":2,"max":10},"product":{"min":4,"max":100}}`; answer type `integer`; input `keypad`
- Constraints: Unknown can be first or second factor; answer 1-10
- Examples: `__ x 6 = 42` = 7; `8 x __ = 72` = 9; `__ x 3 = 24` = 8
- Mastery: >= 90% over last 20, <= 5 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. facts x2, x5, x10 `{"known":[2,5,10]}`
  2. all one-digit `{}`

#### 3.11 One-digit x multiple of 10 (`g3-mult-tens`)

- TEKS: 3.4G?  |  CCSS: 3.NBT.A.3
- Description: Multiply 1-9 by 10-90 using the base fact and place value.
- When: spring
- Generator: operation `mul`; operands `{"a":{"min":2,"max":9},"b":{"values":[10,20,30,40,50,60,70,80,90]}}`; answer type `integer`; input `keypad`
- Constraints: Product <= 810
- Examples: `4 x 30` = 120; `7 x 50` = 350; `9 x 80` = 720
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x10 and x20..x50 `{"b":[10,20,30,40,50]}`
  2. x60..x90 `{"b":[60,70,80,90]}`

#### 3.12 Two-digit x one-digit (`g3-mult-2x1`)

- TEKS: 3.4G  |  CCSS: 4.NBT.B.5?
- Description: Texas teaches 2-digit x 1-digit in grade 3 (CCSS defers it to grade 4).
- When: spring
- Generator: operation `mul`; operands `{"a":{"min":11,"max":99},"b":{"min":2,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: Level 1 no carrying (ones product <= 9 and tens product <= 9); Level 2 carry once; Level 3 carry twice
- Examples: `23 x 4` = 92; `45 x 6` = 270; `68 x 7` = 476
- Mastery: >= 90% over last 20, <= 15 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no carrying `{"carry":"none"}`
  2. carry once `{"carry":"once"}`
  3. carry in both places `{"carry":"both"}`

#### 3.13 Even or odd (`g3-even-odd`)

- TEKS: 3.4I  |  CCSS: 2.OA.C.3
- Description: Decide parity of numbers to 1,000 using the ones digit.
- When: winter
- Generator: operation `parity`; operands `{"n":{"min":10,"max":999}}`; answer type `choice`; input `choice:even,odd`
- Constraints: Balanced even/odd
- Examples: `Is 47 even or odd?` = odd; `Is 120 even or odd?` = even; `Is 583 even or odd?` = odd
- Mastery: >= 95% over last 20, <= 3 s each
- Keypad: choice-yes-no
- Sub-levels (easy to hard):
  1. to 100 `{"max":100}`
  2. to 1,000 `{"max":999}`

#### 3.14 Equivalent fractions (denominators 2,3,4,6,8) (`g3-fraction-equiv`)

- TEKS: 3.3F, 3.3G  |  CCSS: 3.NF.A.3
- Description: Fill the missing numerator to make equal fractions.
- When: spring
- Generator: operation `equivalent_fraction_numerator`; operands `{"den1":{"values":[2,3,4,6]},"den2":{"values":[4,6,8]}}`; answer type `integer`; input `keypad`
- Constraints: den2 is a multiple of den1; numerator < denominator (proper fractions)
- Examples: `1/2 = __/4` = 2; `2/3 = __/6` = 4; `3/4 = __/8` = 6
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits, fraction-display
- Sub-levels (easy to hard):
  1. halves to fourths/sixths/eighths `{"den1":[2]}`
  2. thirds and fourths `{"den1":[3,4]}`
  3. any pair in set `{}`

#### 3.15 Compare fractions (same numerator or denominator) (`g3-fraction-compare`)

- TEKS: 3.3H  |  CCSS: 3.NF.A.3d
- Description: Choose <, >, = when the fractions share a numerator or denominator.
- When: spring
- Generator: operation `compare_fractions`; operands `{"den":{"values":[2,3,4,6,8]},"num":{"min":1,"max":8}}`; answer type `symbol`; input `choice:<,>,=`
- Constraints: Same denominator OR same numerator, never both different
- Examples: `3/8 _ 5/8` = <; `1/3 _ 1/6` = >; `4/6 _ 3/6` = >
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: choice-symbols
- Sub-levels (easy to hard):
  1. same denominator `{"share":"den"}`
  2. same numerator `{"share":"num"}`
  3. mixed `{}`

#### 3.16 Money totals with dollars (`g3-money-dollars`)

- TEKS: 3.4C  |  CCSS: 2.MD.C.8
- Description: Total of bills and coins, answered in dollars with a decimal point.
- When: spring
- Generator: operation `money_total`; operands `{"bills":{"values":[1,5,10]},"coins":{"types":["quarter","dime","nickel","penny"]}}`; answer type `decimal`; input `keypad`
- Constraints: total <= $20
- Examples: `3 quarters + 2 dimes = $__` = 0.95; `$5 bill + 3 dimes = $__` = 5.30; `1 dollar + 2 quarters = $__` = 1.50
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. cents only, answer in cents `{"answerUnit":"cents"}`
  2. bills + quarters/dimes `{"coins":["quarter","dime"]}`
  3. all coins `{}`

**Out of scope / adaptations (grade 3):**
- Area/perimeter (3.6), elapsed time (3.7), measurement, graphs (3.8), 2D shapes (3.6): Area/perimeter of a rectangle with integer sides is drillable as a one-number answer; elapsed time as minutes.
- Word problems and strip diagrams (3.4K, 3.5): Out of scope; could wrap generators in story templates.

### Grade 4 (4th grade, ages 9-10)

**Fluency standards:** TEKS 4.4H: fluently solve one- and two-step multiplication and division problems, including interpreting remainders. 4.4A add/subtract whole numbers and decimals to hundredths with the standard algorithm; 4.4C includes perfect squares up to 15x15. CCSS 4.NBT.B.4 (fluent add/subtract with standard algorithm, to 1,000,000).

**Times tables:** 11s, 12s and squares to 15x15 (4.4C) live here: the 44 Problem rows with a factor 11 or 12 map to the grade 4 level g4-mult-11-15; grade 3 rows are reviewed with spaced repetition rather than retaught.

#### 4.1 Place value and rounding to 1,000,000 (`g4-place-value-round`)

- TEKS: 4.2A, 4.2D  |  CCSS: 4.NBT.A.1, 4.NBT.A.3
- Description: Round whole numbers to any place through hundred thousands; read digit values.
- When: fall
- Generator: operation `round`; operands `{"n":{"min":1000,"max":999999},"place":{"values":[10,100,1000,10000,100000]}}`; answer type `integer`; input `keypad`
- Constraints: Include midpoint and 9-carry cases (e.g. 7,951 to nearest 100)
- Examples: `Round 48,372 to the nearest thousand` = 48000; `Round 365,810 to the nearest hundred thousand` = 400000; `Round 7,451 to the nearest hundred` = 7500
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. nearest 10/100, <= 4 digits `{"place":[10,100],"max":9999}`
  2. nearest 1,000, <= 5 digits `{"place":[1000],"max":99999}`
  3. any place to 100,000, <= 6 digits `{}`

#### 4.2 Add/subtract multi-digit numbers (`g4-add-sub-large`)

- TEKS: 4.4A  |  CCSS: 4.NBT.B.4
- Description: Standard-algorithm addition/subtraction up to 6 digits.
- When: fall
- Generator: operation `add_sub`; operands `{"a":{"min":1000,"max":999999},"b":{"min":1000,"max":999999}}`; answer type `integer`; input `keypad`
- Constraints: subtraction a >= b; sum <= 1,000,000
- Examples: `4,382 + 2,759` = 7141; `52,618 - 9,347` = 43271; `300,450 + 275,980` = 576430
- Mastery: >= 90% over last 20, <= 25 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. 4-digit, no regrouping `{"digits":4,"regroup":"none"}`
  2. 4-digit, regroup `{"digits":4,"regroup":"any"}`
  3. 5-digit `{"digits":5}`
  4. 6-digit, subtract across zeros `{"digits":6,"zeros":true}`

#### 4.3 Multiply by 10 and 100 (`g4-mult-10-100`)

- TEKS: 4.4B  |  CCSS: 4.NBT.A.1, 5.NBT.A.2?
- Description: Place-value shift: multiply a number by 10 or 100.
- When: fall
- Generator: operation `mul`; operands `{"a":{"min":2,"max":999},"b":{"values":[10,100]}}`; answer type `integer`; input `keypad`
- Constraints: Whole numbers only
- Examples: `37 x 10` = 370; `64 x 100` = 6400; `250 x 10` = 2500
- Mastery: >= 95% over last 20, <= 5 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x10 `{"b":[10]}`
  2. x100 `{"b":[100]}`
  3. mixed, 3-digit factors `{"b":[10,100],"max":999}`

#### 4.4 Multiplication beyond 10: 11s, 12s, squares to 15x15 (`g4-mult-11-15`)

- TEKS: 4.4C  |  CCSS: 4.NBT.B.5?
- Description: Finishes the 12x12 table and the perfect squares through 15x15.
- When: fall/winter
- Generator: operation `mul`; operands `{"a":{"min":1,"max":12},"b":{"min":11,"max":12},"squaresOnly":{"min":13,"max":15}}`; answer type `integer`; input `keypad`
- Constraints: Rows of existing Problem table with a factor 11 or 12 (44 rows); Squares 13x13, 14x14, 15x15 are generated, not stored
- Examples: `11 x 12` = 132; `12 x 7` = 84; `15 x 15` = 225
- Mastery: >= 95% over last 20, <= 4 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x11 `{"b":[11]}`
  2. x12 `{"b":[12]}`
  3. 11 and 12 mixed with review `{"b":[11,12]}`
  4. squares 11-15 `{"squaresOnly":true}`

#### 4.5 Multiply 2-4 digit by 1-digit (`g4-mult-multi-by-1`)

- TEKS: 4.4D  |  CCSS: 4.NBT.B.5
- Description: Standard algorithm or partial products for up to a four-digit number by a single digit.
- When: winter
- Generator: operation `mul`; operands `{"a":{"min":10,"max":9999},"b":{"min":2,"max":9}}`; answer type `integer`; input `keypad`
- Constraints: Product < 100,000
- Examples: `46 x 8` = 368; `319 x 6` = 1914; `2,507 x 4` = 10028
- Mastery: >= 90% over last 20, <= 20 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. 2-digit `{"digits":2}`
  2. 3-digit `{"digits":3}`
  3. 4-digit `{"digits":4}`
  4. with zeros (2,507) `{"digits":4,"zeros":true}`

#### 4.6 Multiply 2-digit x 2-digit (`g4-mult-2x2`)

- TEKS: 4.4D  |  CCSS: 4.NBT.B.5
- Description: Two-digit by two-digit multiplication.
- When: winter/spring
- Generator: operation `mul`; operands `{"a":{"min":11,"max":99},"b":{"min":11,"max":99}}`; answer type `integer`; input `keypad`
- Constraints: Level 1: one factor multiple of 10
- Examples: `24 x 13` = 312; `47 x 36` = 1692; `85 x 62` = 5270
- Mastery: >= 90% over last 20, <= 35 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. one factor a multiple of 10 `{"multipleOf10":true}`
  2. factors 11-19 `{"b":[11,19]}`
  3. any 2-digit `{}`

#### 4.7 Divide by a one-digit number, with remainders (`g4-div-1digit`)

- TEKS: 4.4E, 4.4F, 4.4H  |  CCSS: 4.NBT.B.6, 4.OA.A.3
- Description: Up to 4-digit dividend, divisor 2-9; answer as quotient and remainder.
- When: winter/spring
- Generator: operation `div`; operands `{"dividend":{"min":10,"max":9999},"divisor":{"min":2,"max":9}}`; answer type `quotient_remainder`; input `two-field:quotient,remainder`
- Constraints: Level 1-2: no remainder; Level 3+: remainder 0 to divisor-1; Quotient at least 10
- Examples: `84 / 4` = 21; `157 / 6` = 26 R 1; `1,000 / 7` = 142 R 6
- Mastery: >= 90% over last 20, <= 25 s each
- Keypad: digits, remainder-field
- Sub-levels (easy to hard):
  1. 2-digit, whole quotient `{"digits":2,"remainder":false}`
  2. 3-digit, whole quotient `{"digits":3,"remainder":false}`
  3. 2-3 digit with remainder `{"digits":3,"remainder":true}`
  4. 4-digit with remainder `{"digits":4,"remainder":true}`

#### 4.8 Estimate by rounding (`g4-estimate`)

- TEKS: 4.4G  |  CCSS: 4.OA.A.3, 3.OA.D.8
- Description: Estimate sums, differences, products by rounding to a stated place.
- When: winter
- Generator: operation `estimate`; operands `{"a":{"min":100,"max":9999},"b":{"min":10,"max":9999},"place":{"values":[10,100,1000]},"operation":{"values":["add","sub","mul"]}}`; answer type `integer`; input `keypad`
- Constraints: Prompt states the place to round to
- Examples: `Estimate 487 + 312 (nearest 100)` = 800; `Estimate 38 x 52 (nearest 10)` = 2000; `Estimate 6,812 - 2,190 (nearest 1,000)` = 5000
- Mastery: >= 90% over last 20, <= 15 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. add/sub, nearest 100 `{"ops":["add","sub"],"place":100}`
  2. add/sub, nearest 1,000 `{"ops":["add","sub"],"place":1000}`
  3. products, nearest 10 `{"ops":["mul"],"place":10}`

#### 4.9 Factors and multiples (`g4-factors-multiples`)

- TEKS: 4.4?, 5.4A?  |  CCSS: 4.OA.B.4
- Description: Is X a factor of N? What is the next multiple of K? (No direct grade 4 SE in 2012 TEKS text read; related to 5.4A.)
- When: winter
- Generator: operation `factor_multiple`; operands `{"n":{"min":6,"max":100},"k":{"min":2,"max":12}}`; answer type `mixed`; input `choice:yes,no OR keypad`
- Constraints: Balanced yes/no answers
- Examples: `Is 6 a factor of 54?` = yes; `Is 8 a factor of 42?` = no; `Smallest multiple of 7 greater than 30` = 35
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits, choice-yes-no
- Sub-levels (easy to hard):
  1. factor yes/no, k 2-5, 10 `{"k":[2,3,4,5,10]}`
  2. factor yes/no, k up to 12 `{"k":[2,12]}`
  3. next multiple `{"mode":"nextMultiple"}`

#### 4.10 Equivalent fractions (`g4-fraction-equiv`)

- TEKS: 4.3C  |  CCSS: 4.NF.A.1
- Description: Fill missing numerator or denominator for an equal fraction.
- When: fall/winter
- Generator: operation `equivalent_fraction_missing`; operands `{"den1":{"min":2,"max":10},"factor":{"min":2,"max":6}}`; answer type `integer`; input `keypad`
- Constraints: den2 = den1 x factor <= 100; Unknown is numerator (L1) or denominator (L2)
- Examples: `2/3 = __/12` = 8; `3/5 = __/10` = 6; `6/8 = 3/__` = 4
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits, fraction-display
- Sub-levels (easy to hard):
  1. unknown numerator, factor 2-3 `{"unknown":"num","factor":[2,3]}`
  2. unknown numerator, factor up to 6 `{"unknown":"num","factor":[2,6]}`
  3. unknown denominator, simplify `{"unknown":"den"}`

#### 4.11 Compare fractions (`g4-fraction-compare`)

- TEKS: 4.3D  |  CCSS: 4.NF.A.2
- Description: Compare using benchmarks (0, 1/2, 1) or common denominators.
- When: winter
- Generator: operation `compare_fractions`; operands `{"den":{"min":2,"max":12}}`; answer type `symbol`; input `choice:<,>,=`
- Constraints: Level 1 benchmark 1/2; level 2 unlike denominators with multiples; level 3 any
- Examples: `3/5 _ 2/3` = <; `5/8 _ 1/2` = >; `3/4 _ 7/10` = >
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: choice-symbols
- Sub-levels (easy to hard):
  1. vs 1/2 benchmark `{"vs":"1/2"}`
  2. one denominator multiple of other `{"multiple":true}`
  3. any denominators 2-12 `{}`

#### 4.12 Add/subtract fractions, same denominator (`g4-fraction-add-sub`)

- TEKS: 4.3E  |  CCSS: 4.NF.B.3
- Description: Add and subtract like fractions; improper results allowed (mixed forms accepted).
- When: winter/spring
- Generator: operation `fraction_add_sub`; operands `{"den":{"min":2,"max":12},"num1":{"min":1,"max":11},"num2":{"min":1,"max":11}}`; answer type `fraction`; input `keypad`
- Constraints: Level 1 result <= 1; Level 2 may exceed 1; Accept equivalent forms (improper or mixed)
- Examples: `3/8 + 2/8` = 5/8; `7/10 - 4/10` = 3/10; `5/6 + 4/6` = 9/6
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: digits, fraction-slash, mixed-number-space
- Sub-levels (easy to hard):
  1. sum <= 1 `{"sumMax":1}`
  2. subtraction `{"op":"sub"}`
  3. improper result `{"allowImproper":true}`

#### 4.13 Tenths and hundredths as fractions and decimals (`g4-decimals-frac`)

- TEKS: 4.2G, 4.2F, 4.3G  |  CCSS: 4.NF.C.5, 4.NF.C.6, 4.NF.C.7
- Description: Convert tenths/hundredths between fraction and decimal; pick the greater decimal.
- When: winter
- Generator: operation `fraction_decimal_convert_compare`; operands `{"tenths":{"min":1,"max":9},"hundredths":{"min":1,"max":99}}`; answer type `decimal`; input `keypad`
- Constraints: Comparison pairs differ by place-value trap (0.4 vs 0.35)
- Examples: `0.7 = __/10` = 7; `3/100 as a decimal` = 0.03; `Greater: 0.4 or 0.35?` = 0.4
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. tenths: fraction to decimal `{"place":"tenths"}`
  2. hundredths: fraction to decimal `{"place":"hundredths"}`
  3. which is greater `{"mode":"compare"}`

#### 4.14 Add/subtract decimals to hundredths (money) (`g4-decimal-add-sub`)

- TEKS: 4.4A  |  CCSS: 5.NBT.B.7?, 4.MD.A.2
- Description: Standard algorithm for decimals to hundredths; money context.
- When: spring
- Generator: operation `add_sub`; operands `{"a":{"min":0.1,"max":99.99,"decimals":2},"b":{"min":0.1,"max":99.99,"decimals":2}}`; answer type `decimal`; input `keypad`
- Constraints: Same decimal places first, then 1 vs 2 places; Result positive
- Examples: `3.45 + 2.30` = 5.75; `8.00 - 2.75` = 5.25; `$12.60 + $4.85` = 17.45
- Mastery: >= 90% over last 20, <= 20 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. same places, money style `{"decimals":2}`
  2. tenths with hundredths `{"mixed":true}`
  3. subtract from whole numbers `{"fromWhole":true}`

**Out of scope / adaptations (grade 4):**
- Angles/measurement (4.7), 2D shape attributes (4.6), line plots and data (4.9), financial literacy: 'Angle sum in a triangle', 'supplementary angle' as integer answers; protractor reading out of scope.
- Input-output tables and number patterns (4.5B): 'Rule: add 6. 4, 10, 16, __' integer answers; fits existing skip-count generator.

### Grade 5 (5th grade, ages 10-11)

**Fluency standards:** TEKS 5.3 contains the fluency SEs: 5.3B (3-digit x 2-digit standard algorithm), 5.3C (up to 4-digit by 2-digit divide), 5.3K (add/subtract positive rational numbers fluently). CCSS 5.NBT.B.5 is the fluency standard (multi-digit multiply with the standard algorithm); 5.NBT.B.6 and 5.NBT.B.7 cover division and decimal operations.

**Times tables:** None new. The full 12x12 table is review; spaced repetition resurfaces unmastered facts inside multi-digit problems.

#### 5.1 Decimal place value and rounding (`g5-decimal-place-round`)

- TEKS: 5.2A, 5.2C  |  CCSS: 5.NBT.A.1, 5.NBT.A.4
- Description: Value of a digit and rounding decimals to tenths or hundredths.
- When: fall
- Generator: operation `round_decimal`; operands `{"n":{"min":0.001,"max":99.999,"decimals":3},"place":{"values":["tenths","hundredths"]}}`; answer type `decimal`; input `keypad`
- Constraints: Midpoint cases included
- Examples: `Round 3.846 to the nearest hundredth` = 3.85; `Round 12.34 to the nearest tenth` = 12.3; `Value of the 7 in 4.173` = 0.07
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. digit value to thousandths `{"mode":"digitValue"}`
  2. round to tenths `{"place":"tenths"}`
  3. round to hundredths `{"place":"hundredths"}`

#### 5.2 Multiply/divide by powers of 10 (`g5-powers-of-10`)

- TEKS: 5.2?, 5.3?  |  CCSS: 5.NBT.A.2
- Description: Shift the decimal point; exponents of 10.
- When: fall
- Generator: operation `scale_by_power_of_10`; operands `{"n":{"min":0.001,"max":9999,"decimals":3},"power":{"values":[10,100,1000]},"direction":{"values":["mul","div"]}}`; answer type `decimal`; input `keypad`
- Constraints: Level 3 asks 10^k as a number
- Examples: `4.5 x 100` = 450; `36 / 1000` = 0.036; `10^3 = __` = 1000
- Mastery: >= 95% over last 20, <= 6 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. whole x 10,100,1000 `{"mode":"mul","wholeOnly":true}`
  2. decimal x power of 10 `{"mode":"mul"}`
  3. divide by power of 10 `{"mode":"div"}`
  4. exponent form 10^k `{"exponentForm":true}`

#### 5.3 Multiply 3-digit x 2-digit (`g5-mult-3x2`)

- TEKS: 5.3B  |  CCSS: 5.NBT.B.5
- Description: Standard algorithm; core fluency target for grade 5.
- When: fall/winter
- Generator: operation `mul`; operands `{"a":{"min":100,"max":999},"b":{"min":10,"max":99}}`; answer type `integer`; input `keypad`
- Constraints: Level 1: 2-digit x 2-digit
- Examples: `243 x 15` = 3645; `508 x 36` = 18288; `999 x 99` = 98901
- Mastery: >= 90% over last 20, <= 45 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. 2x2 review `{"a":[10,99]}`
  2. 3x2 no zeros `{"zeros":false}`
  3. 3x2 with zeros `{"zeros":true}`

#### 5.4 Divide by a two-digit divisor (`g5-div-2digit`)

- TEKS: 5.3C  |  CCSS: 5.NBT.B.6
- Description: Up to 4-digit dividend by 2-digit divisor; whole quotient first, then remainder.
- When: winter
- Generator: operation `div`; operands `{"dividend":{"min":100,"max":9999},"divisor":{"min":11,"max":99}}`; answer type `quotient_remainder`; input `two-field:quotient,remainder`
- Constraints: Level 1-2 whole quotient; Level 3 with remainder (CCSS also allows decimal quotient later)
- Examples: `936 / 12` = 78; `2,415 / 35` = 69; `1,000 / 48` = 20 R 40
- Mastery: >= 90% over last 20, <= 50 s each
- Keypad: digits, remainder-field
- Sub-levels (easy to hard):
  1. divisor multiple of 10, whole quotient `{"divisorMultipleOf10":true}`
  2. any 2-digit, whole quotient `{"remainder":false}`
  3. with remainder `{"remainder":true}`

#### 5.5 Add/subtract decimals (`g5-decimal-add-sub`)

- TEKS: 5.3K  |  CCSS: 5.NBT.B.7
- Description: Positive decimals to hundredths (thousandths for compare only), mixed place counts.
- When: fall
- Generator: operation `add_sub`; operands `{"a":{"min":0.01,"max":99.99,"decimals":2},"b":{"min":0.01,"max":99.99,"decimals":2}}`; answer type `decimal`; input `keypad`
- Constraints: Subtraction non-negative; align-decimals traps with whole numbers (10 - 3.62)
- Examples: `4.7 + 2.35` = 7.05; `10 - 3.62` = 6.38; `0.84 + 1.9` = 2.74
- Mastery: >= 90% over last 20, <= 20 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. same decimal places `{"aligned":true}`
  2. different decimal places `{"aligned":false}`
  3. from a whole number `{"fromWhole":true}`

#### 5.6 Multiply decimals (`g5-decimal-mult`)

- TEKS: 5.3D, 5.3E  |  CCSS: 5.NBT.B.7
- Description: Decimal x whole, then decimal x decimal to hundredths; money.
- When: winter
- Generator: operation `mul`; operands `{"a":{"min":0.1,"max":99.9,"decimals":2},"b":{"min":0.01,"max":12,"decimals":2}}`; answer type `decimal`; input `keypad`
- Constraints: Product has <= 4 decimal places in level 3; Accept trailing zeros (3 or 3.0)
- Examples: `0.6 x 0.3` = 0.18; `4.2 x 3` = 12.6; `2.5 x 1.2` = 3
- Mastery: >= 90% over last 20, <= 25 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. decimal x whole `{"b":"whole"}`
  2. tenths x tenths `{"decimals":1}`
  3. hundredths included `{"decimals":2}`

#### 5.7 Divide decimals (`g5-decimal-div`)

- TEKS: 5.3F, 5.3G  |  CCSS: 5.NBT.B.7
- Description: Quotients to hundredths with whole-number divisors (2-digit); terminating results only.
- When: spring
- Generator: operation `div`; operands `{"dividend":{"min":0.1,"max":999.99,"decimals":2},"divisor":{"min":2,"max":99}}`; answer type `decimal`; input `keypad`
- Constraints: Quotient terminates within 2 decimal places
- Examples: `7.2 / 4` = 1.8; `9 / 4` = 2.25; `4.56 / 12` = 0.38
- Mastery: >= 90% over last 20, <= 35 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. decimal / 1-digit whole `{"divisorMax":9}`
  2. whole / whole giving decimal (9/4) `{"whole":true}`
  3. decimal / 2-digit `{"divisorMax":99}`

#### 5.8 Add/subtract fractions, unlike denominators (`g5-fraction-add-sub-unlike`)

- TEKS: 5.3H  |  CCSS: 5.NF.A.1
- Description: Common denominators with small denominators; answers as fraction (improper OK) or mixed number.
- When: winter/spring
- Generator: operation `fraction_add_sub`; operands `{"den1":{"min":2,"max":12},"den2":{"min":2,"max":12}}`; answer type `fraction`; input `keypad`
- Constraints: Level 1: one denominator multiple of the other; Level 3: coprime denominators; Accept equivalent forms; ask simplest form only in last level
- Examples: `1/2 + 1/3` = 5/6; `3/4 - 1/6` = 7/12; `2/3 + 3/4` = 17/12
- Mastery: >= 90% over last 20, <= 25 s each
- Keypad: digits, fraction-slash, mixed-number-space
- Sub-levels (easy to hard):
  1. one denominator is a multiple of the other `{"multiple":true}`
  2. both change `{"multiple":false}`
  3. with mixed numbers `{"mixed":true}`

#### 5.9 Multiply fraction by whole number (`g5-fraction-mult-whole`)

- TEKS: 5.3I  |  CCSS: 5.NF.B.4
- Description: Whole x fraction (Texas stops there; fraction x fraction is grade 6).
- When: spring
- Generator: operation `fraction_mul`; operands `{"whole":{"min":2,"max":12},"num":{"min":1,"max":9},"den":{"min":2,"max":10}}`; answer type `fraction`; input `keypad`
- Constraints: Result may be integer, proper or improper
- Examples: `3 x 2/5` = 6/5; `1/2 x 8` = 4; `5 x 3/10` = 3/2
- Mastery: >= 90% over last 20, <= 15 s each
- Keypad: digits, fraction-slash
- Sub-levels (easy to hard):
  1. unit fraction x whole `{"num":1}`
  2. any numerator `{}`
  3. answer simplified `{"simplify":true}`

#### 5.10 Divide with unit fractions (`g5-unit-fraction-division`)

- TEKS: 5.3L  |  CCSS: 5.NF.B.7
- Description: Unit fraction / whole, whole / unit fraction.
- When: spring
- Generator: operation `fraction_div`; operands `{"whole":{"min":2,"max":12},"den":{"min":2,"max":10}}`; answer type `fraction`; input `keypad`
- Constraints: Alternate the two forms
- Examples: `1/4 / 3` = 1/12; `3 / 1/4` = 12; `5 / 1/2` = 10
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits, fraction-slash
- Sub-levels (easy to hard):
  1. whole / unit fraction `{"mode":"whole_div_unit"}`
  2. unit fraction / whole `{"mode":"unit_div_whole"}`
  3. mixed `{}`

#### 5.11 Order of operations (grouping) (`g5-order-of-ops`)

- TEKS: 5.4E, 5.4F  |  CCSS: 5.OA.A.1
- Description: Evaluate whole-number expressions with parentheses/brackets; no exponents (Texas).
- When: winter
- Generator: operation `expression`; operands `{"terms":{"min":3,"max":5},"values":{"min":1,"max":20}}`; answer type `integer`; input `keypad`
- Constraints: Operators + - x /; Result integer >= 0; Level 3 nested grouping
- Examples: `3 + 4 x 2` = 11; `(3 + 4) x 2` = 14; `20 - (6 + 2) x 2` = 4
- Mastery: >= 90% over last 20, <= 15 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. no parentheses, x before + `{"parens":false}`
  2. one parenthesis `{"parens":1}`
  3. nested grouping `{"parens":2}`

#### 5.12 Prime or composite (`g5-prime-composite`)

- TEKS: 5.4A  |  CCSS: 4.OA.B.4
- Description: Classify numbers to 100 as prime or composite.
- When: fall
- Generator: operation `classify_prime`; operands `{"n":{"min":2,"max":100}}`; answer type `choice`; input `choice:prime,composite`
- Constraints: ~40% prime
- Examples: `Is 29 prime or composite?` = prime; `Is 51 prime or composite?` = composite; `Is 91 prime or composite?` = composite
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: choice-labels
- Sub-levels (easy to hard):
  1. to 30 `{"max":30}`
  2. to 60 `{"max":60}`
  3. to 100 (traps 51, 57, 87, 91) `{"max":100}`

**Out of scope / adaptations (grade 5):**
- Volume of prisms (5.6), coordinate plane graphing (5.8), data (5.9), measurement conversion: Volume l x w x h as integer; ordered pair coordinates would need a grid widget.
- Financial literacy (5.10): Out of scope.

### Grade 6 (6th grade, ages 11-12)

**Fluency standards:** TEKS 6.3D: add, subtract, multiply and divide integers fluently. 6.3E: multiply and divide positive rational numbers fluently (the 2012 text marks both as fluency SEs). Texas puts integer operations in grade 6; CCSS places them in grade 7 (7.NS.A.1-2). CCSS 6.NS.B.2 (multi-digit division), 6.NS.B.3 (multi-digit decimal operations) are the CCSS grade 6 fluency standards.

**Times tables:** None new. Spaced review of any unmastered fact seeded into integer/fraction/percent problems; GCF/LCM and exponents lean on 12x12 recall.

#### 6.1 Multiply fractions and mixed numbers (`g6-fraction-mult`)

- TEKS: 6.3E  |  CCSS: 5.NF.B.4, 6.NS.A.1?
- Description: Fraction x fraction, then mixed numbers; simplify.
- When: fall
- Generator: operation `fraction_mul`; operands `{"den":{"min":2,"max":12},"num":{"min":1,"max":11}}`; answer type `fraction`; input `keypad`
- Constraints: Level 3 mixed numbers; Accept equivalent forms
- Examples: `2/3 x 3/4` = 1/2; `1 1/2 x 2/5` = 3/5; `3 1/3 x 1 1/5` = 4
- Mastery: >= 90% over last 20, <= 20 s each
- Keypad: digits, fraction-slash, mixed-number-space
- Sub-levels (easy to hard):
  1. proper x proper `{}`
  2. whole x mixed `{"mixed":"one"}`
  3. mixed x mixed `{"mixed":"both"}`

#### 6.2 Divide fractions and mixed numbers (`g6-fraction-div`)

- TEKS: 6.3A, 6.3E  |  CCSS: 6.NS.A.1
- Description: Divide using the reciprocal.
- When: fall/winter
- Generator: operation `fraction_div`; operands `{"den":{"min":2,"max":12},"num":{"min":1,"max":11}}`; answer type `fraction`; input `keypad`
- Constraints: Results are integers or simple fractions
- Examples: `1/2 / 1/4` = 2; `3/4 / 3/8` = 2; `2 1/2 / 5` = 1/2
- Mastery: >= 90% over last 20, <= 25 s each
- Keypad: digits, fraction-slash, mixed-number-space
- Sub-levels (easy to hard):
  1. unit fraction / unit fraction `{"unit":true}`
  2. any proper fractions `{}`
  3. mixed numbers `{"mixed":true}`

#### 6.3 Multi-digit whole-number division (`g6-div-multi-digit`)

- TEKS: 5.3C?, 6.3E?  |  CCSS: 6.NS.B.2
- Description: Standard algorithm: 3-5 digit dividend by 2-digit divisor, whole quotients.
- When: fall
- Generator: operation `div`; operands `{"dividend":{"min":1000,"max":99999},"divisor":{"min":11,"max":99}}`; answer type `integer`; input `keypad`
- Constraints: Whole quotient (no remainder) in L1; remainder or decimal after
- Examples: `4,284 / 12` = 357; `15,912 / 36` = 442; `9,000 / 45` = 200
- Mastery: >= 90% over last 20, <= 50 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. whole quotient, 4-digit `{"digits":4,"remainder":false}`
  2. whole quotient, 5-digit `{"digits":5,"remainder":false}`
  3. decimal quotient to hundredths `{"decimalQuotient":true}`

#### 6.4 Decimal operations (+, -, x, /) (`g6-decimal-ops`)

- TEKS: 6.3E, 5.3K  |  CCSS: 6.NS.B.3
- Description: All four operations with decimals to thousandths; divisors may be decimals.
- When: fall/winter
- Generator: operation `mixed_decimal_operation`; operands `{"a":{"min":0.01,"max":99.99,"decimals":3},"b":{"min":0.1,"max":99.9,"decimals":2}}`; answer type `decimal`; input `keypad`
- Constraints: Terminating answers only; Level 3 decimal divisor
- Examples: `12.5 x 0.8` = 10; `7.35 / 0.3` = 24.5; `18.04 - 9.675` = 8.365
- Mastery: >= 90% over last 20, <= 35 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. add/subtract to thousandths `{"ops":["add","sub"]}`
  2. multiply `{"ops":["mul"]}`
  3. divide, whole divisor `{"ops":["div"],"divisor":"whole"}`
  4. divide, decimal divisor `{"ops":["div"],"divisor":"decimal"}`

#### 6.5 Opposites and absolute value (`g6-integers-opp-abs`)

- TEKS: 6.2B  |  CCSS: 6.NS.C.5, 6.NS.C.7
- Description: Opposite and absolute value of integers to +/-100.
- When: fall
- Generator: operation `opposite_absolute`; operands `{"n":{"min":-100,"max":100}}`; answer type `integer`; input `keypad`
- Constraints: Include 0 and double-negative forms (opposite of -7)
- Examples: `Opposite of -7` = 7; `|-12|` = 12; `|-3| + |4|` = 7
- Mastery: >= 95% over last 20, <= 5 s each
- Keypad: digits, minus
- Sub-levels (easy to hard):
  1. opposites `{"mode":"opposite"}`
  2. absolute value `{"mode":"abs"}`
  3. expressions with |x| `{"mode":"abs_expr"}`

#### 6.6 Add/subtract integers (`g6-integer-add-sub`)

- TEKS: 6.3C, 6.3D  |  CCSS: 7.NS.A.1?
- Description: Integers within +/-20 then +/-100; subtraction of negatives.
- When: fall/winter
- Generator: operation `add_sub`; operands `{"a":{"min":-20,"max":20},"b":{"min":-20,"max":20}}`; answer type `integer`; input `keypad`
- Constraints: Show subtraction of a negative as '- (-n)'; Results may be negative
- Examples: `-5 + 8` = 3; `4 - 9` = -5; `-6 - (-2)` = -4
- Mastery: >= 90% over last 20, <= 8 s each
- Keypad: digits, minus
- Sub-levels (easy to hard):
  1. opposite signs, + `{"mode":"signedAdd"}`
  2. same sign, + `{"mode":"sameSign"}`
  3. subtraction positive and negative `{"mode":"sub"}`
  4. to +/-100, mixed `{"range":100}`

#### 6.7 Multiply/divide integers (`g6-integer-mul-div`)

- TEKS: 6.3D  |  CCSS: 7.NS.A.2?
- Description: Sign rules with facts to 12x12.
- When: winter
- Generator: operation `mul_div`; operands `{"a":{"min":-12,"max":12},"b":{"min":-12,"max":12}}`; answer type `integer`; input `keypad`
- Constraints: Division exact, divisor != 0; Use the 12x12 facts
- Examples: `-4 x 6` = -24; `-36 / -9` = 4; `7 x (-8)` = -56
- Mastery: >= 90% over last 20, <= 6 s each
- Keypad: digits, minus
- Sub-levels (easy to hard):
  1. x with one negative `{"mode":"mul1neg"}`
  2. x with two negatives `{"mode":"mul2neg"}`
  3. division `{"mode":"div"}`
  4. mixed `{}`

#### 6.8 Fraction / decimal / percent conversion (`g6-fraction-decimal-percent`)

- TEKS: 6.4G  |  CCSS: 6.RP.A.3c
- Description: Convert benchmark values among forms.
- When: winter
- Generator: operation `convert_forms`; operands `{"set":{"values":["1/2","1/4","3/4","1/5","1/8","3/8","1/10","3/10","1/3","2/3"]}}`; answer type `decimal`; input `keypad`
- Constraints: Percent answers are the number only (prompt shows %)
- Examples: `3/4 = __ %` = 75; `0.35 = __ %` = 35; `1/8 as a decimal` = 0.125
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. fraction to percent (halves, fourths, fifths, tenths) `{}`
  2. decimal to percent `{}`
  3. eighths and thirds `{}`

#### 6.9 Percent of a number (benchmarks) (`g6-percent-of`)

- TEKS: 6.4F, 6.4G  |  CCSS: 6.RP.A.3c
- Description: 1%, 10%, 25%, 50%, then multiples; mental math.
- When: winter/spring
- Generator: operation `percent_of`; operands `{"percent":{"values":[1,10,20,25,50,75]},"n":{"min":10,"max":400}}`; answer type `decimal`; input `keypad`
- Constraints: Result is an integer or terminating decimal; n chosen to divide cleanly
- Examples: `10% of 70` = 7; `25% of 80` = 20; `50% of 46` = 23
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. 10% and 50% `{"percent":[10,50]}`
  2. 25% and 75% `{"percent":[25,75]}`
  3. 1% and 20% `{"percent":[1,20]}`

#### 6.10 Equivalent ratios and unit rates (`g6-ratio-unit-rate`)

- TEKS: 6.4B, 6.4C, 6.4D  |  CCSS: 6.RP.A.2, 6.RP.A.3
- Description: Missing term in equivalent ratios; unit rate by division.
- When: spring
- Generator: operation `ratio_unit_rate`; operands `{"a":{"min":1,"max":12},"b":{"min":2,"max":12},"k":{"min":2,"max":12}}`; answer type `decimal`; input `keypad`
- Constraints: Integer unit rates first; Level 3 decimal unit rate (terminating)
- Examples: `3 : 5 = 12 : __` = 20; `$12 for 4 pens: cost of 1 pen ($)` = 3; `120 miles in 3 hours: miles per hour` = 40
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits, decimal-point
- Sub-levels (easy to hard):
  1. missing term, integer multiple `{"mode":"missingTerm"}`
  2. unit rate, integer `{"mode":"unitRate"}`
  3. unit rate, decimal `{"mode":"unitRate","decimal":true}`

#### 6.11 Exponents and order of operations (`g6-exponents`)

- TEKS: 6.7A?  |  CCSS: 6.EE.A.1, 6.EE.A.2c
- Description: Evaluate whole-number powers and expressions with exponents.
- When: fall/winter
- Generator: operation `evaluate_expression`; operands `{"base":{"min":2,"max":12},"exp":{"min":2,"max":5}}`; answer type `integer`; input `keypad`
- Constraints: Level 1 squares/cubes; Level 3 mixed with +,x and parentheses; Results <= 10,000
- Examples: `4^2` = 16; `2^5` = 32; `3 + 2^3 x 2` = 19
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. squares and cubes `{"exp":[2,3]}`
  2. powers of 2 and 3 (to ^5) `{"base":[2,3],"exp":[2,5]}`
  3. with order of operations `{"mixed":true}`

#### 6.12 GCF and LCM (`g6-gcf-lcm`)

- TEKS: 6.?  |  CCSS: 6.NS.B.4
- Description: Greatest common factor and least common multiple of two numbers up to 100 (GCF) / 12 (LCM). TEKS location not confirmed in 2012 text read.
- When: fall
- Generator: operation `gcf_lcm`; operands `{"a":{"min":2,"max":100},"b":{"min":2,"max":100}}`; answer type `integer`; input `keypad`
- Constraints: LCM operands <= 12; Avoid trivially equal pairs
- Examples: `GCF of 12 and 18` = 6; `LCM of 4 and 6` = 12; `GCF of 24 and 36` = 12
- Mastery: >= 90% over last 20, <= 12 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. GCF, numbers <= 30 `{"mode":"gcf","max":30}`
  2. LCM, numbers <= 12 `{"mode":"lcm","max":12}`
  3. GCF up to 100 `{"mode":"gcf","max":100}`

#### 6.13 One-step equations (`g6-one-step-equations`)

- TEKS: 6.10A?  |  CCSS: 6.EE.B.7
- Description: Solve x + p = q, p x = q, x / p = q with whole numbers.
- When: spring
- Generator: operation `solve_linear`; operands `{"p":{"min":2,"max":12},"x":{"min":1,"max":20}}`; answer type `integer`; input `keypad`
- Constraints: Integer solutions; Level 3 includes decimals or fractions
- Examples: `x + 7 = 15` = 8; `3x = 21` = 7; `x / 4 = 6` = 24
- Mastery: >= 90% over last 20, <= 10 s each
- Keypad: digits
- Sub-levels (easy to hard):
  1. x + p = q / x - p = q `{"forms":["add","sub"]}`
  2. p x = q `{"forms":["mul"]}`
  3. x / p = q `{"forms":["div"]}`
  4. mixed `{}`

**Out of scope / adaptations (grade 6):**
- Area of triangles/polygons (6.8), data displays, box plots, statistics (6.12), inequalities graphing: Area of a right triangle (b x h / 2) with integer sides; mean/median of a short list as integer answer.
- Financial literacy (6.14), geometry proofs: Out of scope.

## 5. Keypad and UI needs

| Need | Grades | Notes |
|---|---|---|
| Digits 0-9, backspace, enter | 1-6 | Exists today. Raise max entry length to 7 digits (grade 4 add/sub to 1,000,000) and keep manual Enter for multi-digit answers (no auto-submit); auto-submit is fine for facts. |
| Choice buttons < > = | 1-4 | Comparison skills; replace keypad by 3 big buttons. |
| Choice buttons yes/no, even/odd, prime/composite | 3-5 | Binary classification skills. |
| Decimal point key | 3-6 | Money in grade 3; decimals grade 4+. Accept '.5', '0.50', '3', '3.0'. Compare numerically, not as strings. |
| Fraction slash and mixed-number space | 4-6 | Accept 'a/b' and 'w a/b'. Mark right if equal value unless the prompt says 'simplest form'. Show a stacked-fraction preview. |
| Remainder entry | 4-5 | Two fields (quotient, remainder) preferred to typing 'R'; label the second field 'R'. Remainder-free levels show one field. |
| Minus / negative key | 6 | Unary minus only at start; display with a true minus sign; allow toggle +/-. |
| Prompt rendering | 1-6 | Fraction, exponent (superscript), absolute value bars, thousand separators in prompts; coin images for money skills; use proper minus and multiplication signs but accept 'x' in stored text. |
| Timing | all | secondsPerProblem includes entry time; add ~1 s for 3-digit answers, ~2 s for 5-digit in thresholds only if real play data shows kids missing them; otherwise keep as listed. |

## 6. Sources and licenses

- **19 TAC Chapter 111 Subchapter A (Grades K-5) and Subchapter B (Grades 6-8) text, via Cornell LII**
  - https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-3
  - https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-4
  - https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-5
  - https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-6
  - https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-7
  - https://www.law.cornell.edu/regulations/texas/19-Tex-Admin-Code-SS-111-26
  - License/notes: Texas state regulations: government edict, effectively public domain. Fetched and read for this spec (the fetch tool paraphrased; SE letters verified, wording is paraphrase). The page showed adoption 2012 and amendment 2013 only.
- **TEA math TEKS resources**
  - https://tea.texas.gov/node/103494
  - https://tea.texas.gov/academics/instructional-materials/tea-available-materials/bluebonnet-learning-k-5-and-secondary-mathematics
  - License/notes: TEA site; state-agency material. The direct TEA PDFs tried (Elementary Math TEKS 2nd Rdg.pdf, Math_TEKS_K-5_1st_draft.pdf) returned 404, so TEKS text came from LII.
- **Common Core State Standards for Mathematics**
  - https://www.thecorestandards.org/Math/Content/3/OA/
  - License/notes: Copyright NGA Center and CCSSO 2010, offered under a public license for supporting the standards; name is a trademark. Reference codes and short paraphrases only. Only 3.OA.C.7 wording was fetched this session; other CCSS codes are from general knowledge and should be spot-checked.
- **Illustrative Mathematics K-5 (Kendall Hunt hosted) unit lists**
  - https://im.kendallhunt.com/k5/families/grade-2/units.html
  - https://im.kendallhunt.com/k5/families/grade-3/units.html
  - https://im.kendallhunt.com/k5/families/grade-4/units.html
  - https://im.kendallhunt.com/k5/families/grade-5/units.html
  - https://im.kendallhunt.com/K5/teachers/grade-1/units.html
  - License/notes: CC BY 4.0 per Kendall Hunt/IM pages (search snippet); IM name and logo not licensed. Used for unit order only; no content copied. IM 6-8 and Eureka/EngageNY were not fetched.
- **Bluebonnet Learning K-5 Math (TEA open education resource)**
  - https://tea.texas.gov/academics/instructional-materials/tea-available-materials/bluebonnet-learning-k-5-and-secondary-mathematics
  - https://www.nisd.net/sites/default/files/attachments/bp_nisd_attachments/2026/3rd-grade-parent-year-at-a-glance.pdf
  - License/notes: TEA page names no license (describes it as an OER); treat as referenced only. Its scope and sequence could NOT be retrieved in this session (the NISD PDF was unreadable), so season labels use IM unit order plus typical Texas pacing, not Bluebonnet pacing.
- **Fact-fluency research**
  - https://www.georgiastandards.org/Georgia-Standards/Documents/3rd-Math-Fluency-NCTM-2015.pdf
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC3144578
  - https://ies.ed.gov/use-work/awards/fostering-fluency-basic-addition-and-subtraction
  - License/notes: Published articles; cited, not reproduced. Seen only through search snippets. The 'about 3 seconds' retrieval criterion is a common convention attributed to Baroody (2006, Teaching Children Mathematics) but no source in this session stated it.
- **Eureka Math / EngageNY, Go Math! Texas, enVision Texas, Texas Math (Savvas/HMH)**
  - License/notes: Not fetched. Go Math!, enVision and similar are copyrighted commercial textbooks: reference by name only, never copy. EngageNY/Eureka licensing is believed to be CC BY-NC-SA (non-commercial) but unverified; check before any reuse.

## 7. Gaps and open decisions

- TEKS edition: only the 2012 text (as mirrored by LII, amended 2013) was read. If Texas has since adopted revised math TEKS, codes and some placements (e.g. fraction x fraction, integer operations) may have moved. Verify against tea.texas.gov / texreg before citing in the UI.
- Grade 1 note: the brief lists 1.3F as a fluency SE; in the text read, the within-20 strategy SE is 1.3D and 1.3F is a problem-posing SE.
- Bluebonnet scope and sequence, Go Math! Texas, enVision Texas, Eureka/EngageNY and IM 6-8 were not retrieved; season labels are approximate.
- CCSS codes other than 3.OA.C.7 are from general knowledge; items ending in `?` are least certain.
- The 3 s criterion and the 90/95% accuracy numbers are conventions/design defaults, not standards-mandated.
- Decide: single 'grade' selector per child vs per-skill free play; whether to add x0 facts and division to the Problem table or generate them; whether to keep integer-only `Problem.answer`.
