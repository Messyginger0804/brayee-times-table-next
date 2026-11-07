# Spelling curriculum, grades 1-6 (Spelling Bee mode)

Prepared 2026-11-06 for Braylee's Times Tables. Texas (DFW) TEKS first, Common Core cross-referenced. Machine-readable twin: `spelling.json` (same words, plus schema notes and source list).

**Copyright stance:** every word list, definition and sentence below is original. Lists were built from the standard's required patterns, public-domain-style high-frequency words and common grade-level vocabulary. No publisher weekly list was copied. See Sources for licenses.

## How the Spelling Bee mode presents words (from the repo)

- The Spelling Bee code (`components/SpellingBeeMode.jsx`, with `components/modes/shared/useSpellingRound.js` and `SpellingViews.jsx`) speaks `Spell: <word>` with browser speech synthesis (no audio files).
- It shows part of speech and definition, then the sentence with the target word blanked as `_____` (case-insensitive `\bword\b` replace), so every sentence in this file contains the exact word form.
- Buttons: hear the word, hear the full sentence. The only hint text is "Type your spelling first" for an empty submit.
- The answer is correct when it equals the word after trimming, lower-casing and turning curly quotes into straight ones (so iOS Smart Punctuation does not break `don't`).
- Words are picked at random with replacement. A round is endless, nothing is saved, and there is no promotion between levels.
- So each row needs: word, partOfSpeech, definition, sentence. Syllable count and unit are for level selection and hints.
- The start panel lets a child with a grade pick Grade 1-6, the kind of words (All mixed, Core, Sight words, Bee challenge) and, for Core, one spelling pattern (unit). See [GAMEPLAY.md](../GAMEPLAY.md).

## Existing `SpellingWord` table (local Docker Postgres, read-only)

Columns: `id`, `word` (UNIQUE), `definition`, `partOfSpeech`, `sentence`, `difficulty` (int default 1), `category` (nullable), `active`, `createdAt`, `updatedAt`. 54 rows; all `difficulty=1`, `category` NULL, `active` true. Plural nouns use `partOfSpeech='plural noun'`; verbs like `shops` and `straps` are stored as 3rd-person verbs. Definitions look dictionary-derived (Merriam-Webster style), sentences are blanks-friendly. There is no grade field, so these 54 mix grade 1-3 words.

### Schema as implemented

All fields below exist on `SpellingWord`. Rows are loaded by `scripts/import-spelling.js` (`npm run db:import-spelling`, supports `--dry-run`), which inserts new words and, on rows that already exist (including the 54 legacy rows), only fills empty columns (`grade`, `unitId`, `tier`, `syllables`, `source`, `category`; legacy words missing from the spec get `grade`, `unitId`, `category` and `source` from `existingWordsClassification`). It never overwrites a non-empty value or deletes.

| Field | Status | Notes |
|---|---|---|
| word, definition, partOfSpeech, sentence, active | original columns | map 1:1 |
| difficulty | original column | 1-3 within a grade; stored but not used by the picker |
| category | original column | holds the same value as `unitId` in `spelling.json`; the app filters on `unitId` |
| grade | int 1-6 | main filter (`?grade=`) |
| unitId | text | pattern unit, e.g. `g3u6` (`?unit=`) |
| tier | text core/hf/bee | `?tier=` |
| syllables | int | stored, not shown in the UI |
| source | text | original or legacy |

### Level mapping as implemented

Resolved in favour of the code. The earlier recommendation (ramp difficulty, promote a player after about 8 of 10 difficulty-2 words, parent override of the starting grade) is not built. What the app does:

- There is no level progression in Spelling Bee. The player's grade (set on the home screen, the same grade as the math missions) is the default word set; the picker can switch to any grade 1-6.
- Inside a grade the player may restrict to one tier (`core`, `hf` sight words, `bee`) and, for core, one unit. Difficulty is not used for selection.
- No spelling attempts are saved; `SpellingAttempt` exists in the schema but nothing writes to it.
- `GET /api/spelling/words` uses the signed-in player's grade when no `grade` is passed. If no `grade`, `unit` or `tier` was passed and the table has no rows for the player's grade it returns every active word; if the table is empty or the database fails it returns the bundled 54-word list (`lib/spellingWords.json`).
- The unit titles in the picker come from `lib/spellingUnits.js`, an embedded copy of this file's unit list (79 units) with kid-friendly titles. It is not generated at build time, so update it by hand when `spelling.json` units change.

| Level | Words | core | hf | bee |
|---|---|---|---|---|
| 1 | 213 | 166 | 32 | 15 |
| 2 | 228 | 178 | 31 | 19 |
| 3 | 288 | 235 | 31 | 22 |
| 4 | 221 | 169 | 32 | 20 |
| 5 | 234 | 189 | 27 | 18 |
| 6 | 247 | 200 | 27 | 20 |

## Classification of the 54 existing words

By best fit: grade 1: 33, grade 2: 17, grade 3: 4. All are stored as difficulty 1, so existing data cannot tell levels apart; backfill `grade` and `category` from this table and keep difficulty 1.

| Word | Grade | Unit | Note |
|---|---|---|---|
| deep | 1 | g1u7 Vowel teams (ai/ay, ee/ea, oa/ow, oo) |  |
| happy | 1 | g1u6 Open syllables and long vowels (me, go, my, fly) | final -y as long e; could also sit in G2 |
| bump | 1 | g1u3 Initial and final blends |  |
| bear | 2 | g2u3 R-controlled vowels (ar, or, er, ir, ur, ear, air) | ear says /air/ |
| count | 2 | g2u2 Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo) | ou diphthong |
| dunk | 1 | g1u3 Initial and final blends |  |
| feet | 1 | g1u7 Vowel teams (ai/ay, ee/ea, oa/ow, oo) |  |
| cold | 1 | g1u3 Initial and final blends | -old chunk; borderline G1/G2 |
| alone | 1 | g1u5 VCe (silent e) syllables |  |
| click | 1 | g1u3 Initial and final blends |  |
| miss | 1 | g1u4 Double letters and trigraphs (ff, ll, ss, zz, tch, dge) |  |
| shirt | 1 | g1u8 R-controlled vowels (ar, or, er, ir, ur) |  |
| roof | 2 | g2u2 Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo) | oo as /oo/ |
| here | 1 | g1u5 VCe (silent e) syllables | also a G1 sight word |
| lamp | 1 | g1u3 Initial and final blends |  |
| lost | 1 | g1u3 Initial and final blends |  |
| lunch | 1 | g1u2 Digraphs sh, ch, th, wh, ck |  |
| drift | 1 | g1u3 Initial and final blends |  |
| please | 2 | g2u1 Long vowels: VCe and vowel-team review | ea plus silent e |
| spill | 1 | g1u4 Double letters and trigraphs (ff, ll, ss, zz, tch, dge) |  |
| tired | 2 | g2u1 Long vowels: VCe and vowel-team review | long i with r, -ed ending |
| large | 2 | g2u5 Soft c and soft g | soft g |
| lake | 1 | g1u5 VCe (silent e) syllables |  |
| grab | 1 | g1u3 Initial and final blends |  |
| juice | 2 | g2u1 Long vowels: VCe and vowel-team review | long u spelled ui |
| nook | 2 | g2u2 Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo) | oo as /oo/ |
| shops | 1 | g1u9 Endings -s, -es, -ed, -ing | plural -s |
| world | 3 | g3u5 R-controlled syllables in longer words | /wur/ for wor; irregular |
| math | 1 | g1u2 Digraphs sh, ch, th, wh, ck |  |
| pick | 1 | g1u2 Digraphs sh, ch, th, wh, ck |  |
| soap | 1 | g1u7 Vowel teams (ai/ay, ee/ea, oa/ow, oo) |  |
| tools | 2 | g2u2 Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo) | oo plus plural |
| green | 1 | g1u7 Vowel teams (ai/ay, ee/ea, oa/ow, oo) |  |
| muddy | 2 | g2u11 Two-syllable words: VCCV and double consonants | two syllables, double d |
| ripe | 1 | g1u5 VCe (silent e) syllables |  |
| sign | 2 | g2u4 Silent letters (kn, wr, gn, mb) | silent g |
| soup | 2 | g2u2 Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo) | ou as /oo/ |
| warm | 3 | g3u5 R-controlled syllables in longer words | war says /wor/; irregular |
| fresh | 1 | g1u2 Digraphs sh, ch, th, wh, ck | sh plus blend |
| learn | 2 | g2u3 R-controlled vowels (ar, or, er, ir, ur, ear, air) | ear says /er/ |
| frosty | 2 | g2u11 Two-syllable words: VCCV and double consonants | two syllables with final -y |
| crisp | 1 | g1u3 Initial and final blends |  |
| shape | 1 | g1u5 VCe (silent e) syllables |  |
| splash | 1 | g1u3 Initial and final blends | three-letter blend plus sh |
| mushy | 2 | g2u11 Two-syllable words: VCCV and double consonants | two syllables with final -y |
| group | 2 | g2u2 Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo) | ou as /oo/ |
| spine | 1 | g1u5 VCe (silent e) syllables |  |
| straps | 1 | g1u9 Endings -s, -es, -ed, -ing | plural -s after str blend |
| feast | 1 | g1u7 Vowel teams (ai/ay, ee/ea, oa/ow, oo) |  |
| eagle | 3 | g3u6 Final stable syllables (consonant-le) | consonant-le with odd first syllable |
| berries | 2 | g2u8 Endings -s/-es/-ies, -ed and -ing (drop e, double, y to i) | y to ies |
| caves | 1 | g1u9 Endings -s, -es, -ed, -ing | VCe plus -s |
| blanket | 3 | g3u1 Closed syllables in longer words | closed syllables, 3 sounds across |
| catch | 1 | g1u4 Double letters and trigraphs (ff, ll, ss, zz, tch, dge) | tch trigraph |

## TEKS spelling expectations used

| Grade | TEKS (2017 revision, 19 TAC Ch. 110) | What it asks for |
|---|---|---|
| 1 | 1.2C (i-iv), section 110.3 | spell words with closed, open, VCe, vowel-team and r-controlled syllables; initial/final blends, digraphs, trigraphs; sound-spelling patterns; high-frequency words |
| 2 | 2.2C, section 110.4 | silent letters (knife, gnat); compound words, contractions, common abbreviations; multisyllabic words with multiple patterns; syllable division incl. double consonants; prefixes un-, re-, dis- and endings -s -es -ed -ing -er -est; alphabetizing |
| 3 | 3.2B (i-vii), section 110.5 | multisyllabic words by syllable type incl. final stable; homophones; compound words, contractions, abbreviations; multiple sound-spelling patterns; syllable division VCCV, VCV, VCCCV; prefixes; suffixes incl. dropping e, y to i, doubling |
| 4 | 4.2B (i-vi), section 110.6 | multisyllabic by syllable type; homophones; multiple patterns; advanced syllable division; prefixes; suffixes with base changes |
| 5 | 5.2B, section 110.7 | consonant changes (select/selection, music/musician); multiple patterns; advanced syllable division; prefixes; suffixes with base changes |
| 6 | 6.2A (resources for syllabication, pronunciation, word origin) and 6.10D.ix (correct spelling incl. its/it's, affect/effect, there/their/they're, to/two/too), plus 6.2C (Greek/Latin roots and affixes), section 110.18 | dictionary-based spelling and roots; grade 6 has no separate pattern list |

Verification status: 1.2C, 3.2B and 4.2B were read from the TEA breakout PDFs or TEKS Guide. 2.2C and 5.2B came from a third-party transcription and may omit the first item(s); 6.2A/6.10D.ix were read from the TEA grade 6 breakout. Confirm 2.x and 5.x against TEA before publishing.

Bluebonnet Learning (TEA's K-5 OER) and UFLI/CKLA were consulted only at overview level (see Sources), so unit order is TEKS-driven and conventional (short vowels, digraphs, blends, VCe, vowel teams, r-controlled, endings, then syllable types, affixes, roots). Compare with Bluebonnet's own phonics scope and sequence before locking the order.

## Grade-by-grade spec

Difficulty: 1 easy, 2 medium, 3 hard within the grade. `syl` = syllables. POS = part of speech.

## Grade 1

Focus: Closed, open and VCe syllables, vowel teams, r-controlled, blends, digraphs and trigraphs, simple endings.

### g1u1: Short vowels in CVC words

- TEKS: 1.2C.i, 1.2C.iii; CCSS: RF.1.3.b, L.1.2.d
- Typical time of year: Aug-Sep
- Tier: core; 17 words
- Rule for kids: Short vowel words are like a drum beat: consonant, vowel, consonant. Say each sound, then write it.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| cat | noun | 1 | 1 | a small furry pet that purrs | Our cat naps in a sunny spot. |
| dog | noun | 1 | 1 | a pet that barks and wags its tail | The dog wagged its tail at me. |
| sun | noun | 1 | 1 | the bright star that gives us light | The sun rose over the hills. |
| hat | noun | 1 | 1 | a cover you wear on your head | I wore a hat to keep my head warm. |
| red | adjective | 1 | 1 | the color of a ripe apple | She picked a red balloon. |
| pig | noun | 1 | 1 | a farm animal with a curly tail | The pig rolled in the mud. |
| bed | noun | 1 | 1 | a place where you sleep | I read a story in my bed. |
| cup | noun | 1 | 1 | a small bowl with a handle for drinking | He filled his cup with water. |
| map | noun | 1 | 1 | a drawing that shows where places are | We used a map to find the park. |
| run | verb | 1 | 1 | to move fast on your feet | I like to run with my dog. |
| sit | verb | 1 | 1 | to rest on a chair or the floor | Please sit next to me. |
| net | noun | 1 | 2 | a mesh used to catch things | The fish swam away from the net. |
| hop | verb | 1 | 1 | to jump on one foot or like a bunny | Bunnies hop across the grass. |
| bug | noun | 1 | 1 | a tiny crawling insect | A bug crawled up the leaf. |
| fan | noun | 1 | 2 | a machine that blows cool air | The fan kept our room cool. |
| mud | noun | 1 | 2 | wet, soft dirt | We splashed in the mud. |
| jet | noun | 1 | 2 | a very fast airplane | The jet zoomed across the sky. |

### g1u2: Digraphs sh, ch, th, wh, ck

- TEKS: 1.2C.ii, 1.2C.iii; CCSS: RF.1.3.a, L.1.2.d
- Typical time of year: Sep-Oct
- Tier: core; 17 words
- Rule for kids: Two letters can team up to make one new sound: sh, ch, th, wh. At the end of a short word, /k/ is spelled ck.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| ship | noun | 1 | 1 | a big boat that crosses the sea | The ship sailed across the ocean. |
| chin | noun | 1 | 1 | the part of your face under your mouth | She rested her chin on her hand. |
| thin | adjective | 1 | 1 | not thick or wide | The paper was thin and light. |
| whale | noun | 1 | 2 | a huge animal that lives in the sea | A whale splashed in the waves. |
| duck | noun | 1 | 1 | a bird that swims and quacks | The duck paddled across the pond. |
| chip | noun | 1 | 1 | a small crunchy snack | I ate a chip with my sandwich. |
| shell | noun | 1 | 1 | the hard cover on a snail or egg | I found a pink shell on the beach. |
| path | noun | 1 | 1 | a narrow way for walking | We walked down the path to the creek. |
| check | verb | 1 | 2 | to look to make sure something is right | Please check your work. |
| thick | adjective | 1 | 2 | wide from one side to the other | The soup was thick and tasty. |
| shed | noun | 1 | 2 | a small building for tools | Dad keeps the bikes in the shed. |
| chat | verb | 1 | 1 | to talk in a friendly way | The friends like to chat at lunch. |
| wish | noun | 1 | 1 | something you hope will come true | She made a wish on her birthday. |
| much | adjective | 1 | 1 | a large amount | Thank you very much. |
| rock | noun | 1 | 1 | a hard piece of stone | I skipped a rock across the lake. |
| when | adverb | 1 | 1 | at what time | When will we go to the park? |
| such | adjective | 1 | 2 | of that kind | It was such a fun day. |

### g1u3: Initial and final blends

- TEKS: 1.2C.ii, 1.2C.iii; CCSS: RF.1.3.b, L.1.2.d
- Typical time of year: Oct-Nov
- Tier: core; 18 words
- Rule for kids: In a blend, you hear each letter sound: s-t-o-p. Say the sounds slowly and write them in order.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| stop | verb | 1 | 1 | to quit moving | Stop at the red light. |
| frog | noun | 1 | 1 | a green animal that hops and croaks | The frog jumped into the pond. |
| flag | noun | 1 | 1 | a cloth with colors or a picture | The flag waved in the wind. |
| plan | noun | 1 | 1 | an idea for how to do something | We made a plan for the picnic. |
| clap | verb | 1 | 1 | to hit your hands together | We clap when the song ends. |
| skip | verb | 1 | 1 | to hop from one foot to the other | The girls skip down the street. |
| nest | noun | 1 | 1 | a bird's home made of twigs | A bird sat in the nest. |
| tent | noun | 1 | 1 | a cloth shelter for camping | We slept in a tent under the stars. |
| hand | noun | 1 | 1 | the part at the end of your arm | I raised my hand to answer. |
| gift | noun | 1 | 1 | a present you give to someone | She wrapped a gift for her friend. |
| milk | noun | 1 | 1 | a white drink from cows | I had milk with my cereal. |
| sled | noun | 1 | 2 | a small ride for sliding on snow | We pulled the sled up the hill. |
| swim | verb | 1 | 1 | to move through water | I can swim across the pool. |
| twin | noun | 1 | 2 | one of two children born together | My twin and I share a room. |
| drum | noun | 1 | 1 | an instrument you hit to make a beat | He played a loud drum. |
| jump | verb | 1 | 1 | to push off the ground with your feet | I can jump over the puddle. |
| crab | noun | 1 | 2 | a sea animal with claws | A crab hid under a rock. |
| trunk | noun | 1 | 3 | an elephant's long nose | The elephant lifted its trunk. |

### g1u4: Double letters and trigraphs (ff, ll, ss, zz, tch, dge)

- TEKS: 1.2C.ii, 1.2C.iii; CCSS: RF.1.3.b, L.1.2.d
- Typical time of year: Nov
- Tier: core; 17 words
- Rule for kids: After a short vowel in a short word, f, l, s and z often double. The sound /ch/ after a short vowel is tch, and /j/ is dge.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| bell | noun | 1 | 1 | a metal cup that rings | The bell rang for recess. |
| off | adverb | 1 | 1 | not on; away | Please turn off the light. |
| hill | noun | 1 | 1 | a small mountain | We rolled down the hill. |
| grass | noun | 1 | 1 | short green plants on the ground | The grass felt soft under my feet. |
| buzz | verb | 1 | 2 | to make a humming sound like a bee | A bee began to buzz near the flowers. |
| fluff | noun | 1 | 2 | soft, light stuff like feathers | The kitten was covered in fluff. |
| dress | noun | 1 | 1 | a piece of clothing worn by girls | She wore a yellow dress. |
| stuff | noun | 1 | 2 | things or objects | I packed my stuff in my bag. |
| match | noun | 1 | 2 | a game between two teams | We watched a soccer match. |
| ditch | noun | 1 | 3 | a long narrow hole in the ground | Rain filled the ditch. |
| patch | noun | 1 | 2 | a small piece of cloth sewn on | Mom sewed a patch on my jeans. |
| badge | noun | 1 | 3 | a small sign you wear | The helper wore a shiny badge. |
| fudge | noun | 1 | 3 | a soft, sweet candy | We shared a piece of fudge. |
| bridge | noun | 1 | 3 | a way across a river | The train crossed the bridge. |
| pitch | verb | 1 | 2 | to throw a ball to a batter | Can you pitch the ball to me? |
| witch | noun | 1 | 2 | a make-believe woman in a story who casts spells | The witch in the story had a black cat. |
| ledge | noun | 1 | 3 | a thin shelf that sticks out | A bird sat on the window ledge. |

### g1u5: VCe (silent e) syllables

- TEKS: 1.2C.i, 1.2C.iii; CCSS: RF.1.3.c, L.1.2.d
- Typical time of year: Dec-Jan
- Tier: core; 17 words
- Rule for kids: The silent e at the end is a helper. It makes the vowel say its name: cap becomes cape.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| cake | noun | 1 | 1 | a sweet baked treat | We ate cake at the party. |
| bike | noun | 1 | 1 | a two-wheel ride you pedal | I ride my bike to school. |
| home | noun | 1 | 1 | the place where you live | I am happy to be home. |
| cube | noun | 1 | 2 | a shape with six square sides | An ice cube melted in my cup. |
| kite | noun | 1 | 1 | a toy that flies on a string | The kite soared in the breeze. |
| bone | noun | 1 | 1 | a hard part inside your body | The dog buried a bone. |
| rope | noun | 1 | 1 | a thick, strong string | We used a rope to swing. |
| gate | noun | 1 | 1 | a door in a fence | Please close the gate. |
| five | noun | 1 | 1 | the number after four | I have five fingers on one hand. |
| nose | noun | 1 | 1 | the part of your face used for smelling | The flower tickled my nose. |
| tube | noun | 1 | 2 | a long, hollow pipe | He put toothpaste on the brush from the tube. |
| wave | verb | 1 | 1 | to move your hand to say hello | I wave to my neighbor. |
| hide | verb | 1 | 1 | to go where no one can see you | Let's hide behind the tree. |
| rose | noun | 1 | 2 | a flower with thorns on the stem | She smelled a pink rose. |
| time | noun | 1 | 1 | what a clock tells us | It is time for dinner. |
| note | noun | 1 | 2 | a short message you write | I left a note on the table. |
| smile | noun | 1 | 2 | a happy look on your face | His smile made everyone happy. |

### g1u6: Open syllables and long vowels (me, go, my, fly)

- TEKS: 1.2C.i, 1.2C.iii; CCSS: RF.1.3.c, L.1.2.d
- Typical time of year: Jan
- Tier: core; 18 words
- Rule for kids: When a word ends in a vowel, the vowel says its name: go, me, fly. The letter y can say long i or long e.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| me | pronoun | 1 | 1 | the word you use to talk about yourself | Please read the book to me. |
| he | pronoun | 1 | 1 | a word for a boy or man | He kicked the ball into the net. |
| she | pronoun | 1 | 1 | a word for a girl or woman | She waved from the window. |
| we | pronoun | 1 | 1 | you and other people together | We built a sandcastle. |
| be | verb | 1 | 1 | to exist or happen | I want to be a helper. |
| go | verb | 1 | 1 | to move from here to there | We go to the library on Fridays. |
| no | adverb | 1 | 1 | the opposite of yes | No, thank you. |
| so | adverb | 1 | 1 | to a great amount | The puppy is so cute. |
| hi | interjection | 1 | 1 | a friendly way to say hello | Hi, my name is Ava. |
| my | pronoun | 1 | 1 | belonging to me | This is my backpack. |
| by | preposition | 1 | 1 | next to or near | The bike is by the door. |
| fly | verb | 1 | 1 | to move through the air | Birds fly south in the fall. |
| try | verb | 1 | 1 | to give an effort | Try your best on the test. |
| cry | verb | 1 | 1 | to make tears when sad or hurt | Babies cry when they are hungry. |
| sky | noun | 1 | 1 | the space above the earth | The sky was bright blue. |
| baby | noun | 2 | 2 | a very young child | The baby giggled at the puppy. |
| tiger | noun | 2 | 3 | a big cat with stripes | The tiger rested in the shade. |
| robot | noun | 2 | 3 | a machine that can do jobs | The robot picked up the toys. |

### g1u7: Vowel teams (ai/ay, ee/ea, oa/ow, oo)

- TEKS: 1.2C.i, 1.2C.iii; CCSS: RF.1.3.c, L.1.2.d
- Typical time of year: Feb-Mar
- Tier: core; 17 words
- Rule for kids: Sometimes two vowels walk together and one says its name: rain, tree, boat. Use ai and oa in the middle of a word, ay and ow at the end.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| rain | noun | 1 | 1 | water that falls from clouds | We played inside because of the rain. |
| tail | noun | 1 | 1 | the part at the back of an animal | The cat swished its tail. |
| snail | noun | 1 | 2 | a slow animal with a shell | A snail slid across the leaf. |
| day | noun | 1 | 1 | the time from morning to night | It was a sunny day. |
| play | verb | 1 | 1 | to have fun | We play tag at recess. |
| tree | noun | 1 | 1 | a tall plant with a trunk and leaves | We sat under a big tree. |
| sleep | verb | 1 | 2 | to rest with your eyes closed | I sleep for ten hours. |
| seat | noun | 1 | 2 | a place to sit | I found a seat on the bus. |
| beach | noun | 1 | 2 | sandy land next to the sea | We built a sandcastle at the beach. |
| boat | noun | 1 | 1 | a small ship that floats | The boat rocked on the waves. |
| goat | noun | 1 | 2 | a farm animal with horns | The goat ate some hay. |
| snow | noun | 1 | 2 | soft white flakes that fall in winter | We made a snowman out of snow. |
| grow | verb | 1 | 2 | to get bigger | Sunflowers grow tall in summer. |
| road | noun | 1 | 2 | a path for cars to drive on | The road led to the farm. |
| bee | noun | 1 | 1 | a buzzing insect that makes honey | A bee landed on the flower. |
| moon | noun | 1 | 2 | the bright ball in the night sky | The moon was full and bright. |
| boot | noun | 1 | 2 | a shoe that covers your ankle | I put on a boot to walk in the puddle. |

### g1u8: R-controlled vowels (ar, or, er, ir, ur)

- TEKS: 1.2C.i, 1.2C.iii; CCSS: RF.1.3.b, L.1.2.d
- Typical time of year: Mar-Apr
- Tier: core; 15 words
- Rule for kids: When r follows a vowel, it changes the sound. ar says /ar/, or says /or/, and er, ir, ur all say /er/.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| car | noun | 1 | 1 | a vehicle with four wheels | We rode in the car to grandma's house. |
| star | noun | 1 | 1 | a bright light in the night sky | I wished upon a star. |
| farm | noun | 1 | 1 | land where food and animals are raised | The farm has cows and chickens. |
| corn | noun | 1 | 1 | yellow kernels that grow on a stalk | We ate corn at the cookout. |
| fork | noun | 1 | 1 | a tool for eating with points | Use your fork to eat the peas. |
| horse | noun | 1 | 2 | a large animal that people ride | The horse galloped across the field. |
| her | pronoun | 1 | 1 | belonging to a girl or woman | She hugged her little brother. |
| fern | noun | 1 | 2 | a green plant with feathery leaves | A fern grew by the shady path. |
| bird | noun | 1 | 1 | an animal with feathers and wings | A bird sang in the tree. |
| girl | noun | 1 | 1 | a young female child | The girl painted a picture. |
| turn | verb | 1 | 1 | to move around or change direction | It is your turn to roll the dice. |
| burn | verb | 1 | 3 | to be on fire or get too hot | Be careful not to burn your tongue. |
| park | noun | 1 | 1 | an outdoor place for playing | We slid down the slide at the park. |
| storm | noun | 1 | 2 | strong wind and rain | Thunder rumbled during the storm. |
| nurse | noun | 1 | 2 | a person who helps sick people | The nurse gave me a bandage. |

### g1u9: Endings -s, -es, -ed, -ing

- TEKS: 1.2C.iii; CCSS: RF.1.3.f, L.1.1.c, L.1.2.d
- Typical time of year: Apr-May
- Tier: core; 15 words
- Rule for kids: Add -s to make more than one. Add -es after s, x, sh and ch. Add -ed for past time and -ing for doing it now. Double the last letter after a short vowel.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| jumps | verb | 1 | 1 | leaps off the ground | The frog jumps into the pond. |
| boxes | plural noun | 2 | 2 | containers with flat sides | We packed the toys in boxes. |
| dishes | plural noun | 2 | 2 | plates and bowls | I help dry the dishes. |
| jumped | verb | 1 | 1 | leaped in the past | She jumped over the puddle. |
| helped | verb | 1 | 1 | gave aid in the past | He helped his dad wash the car. |
| wished | verb | 1 | 2 | hoped for something in the past | We wished for a snow day. |
| playing | verb | 2 | 1 | having fun right now | The kids are playing in the yard. |
| helping | verb | 2 | 1 | giving aid right now | I am helping Mom bake cookies. |
| running | verb | 2 | 2 | moving fast on foot right now | The puppy is running in circles. |
| hopping | verb | 2 | 3 | jumping right now | The bunny is hopping across the lawn. |
| clapped | verb | 1 | 3 | hit hands together in the past | The crowd clapped for the singer. |
| baking | verb | 2 | 2 | cooking in an oven right now | Grandma is baking bread. |
| riding | verb | 2 | 2 | going on a bike or horse right now | I am riding my bike to the park. |
| hugged | verb | 1 | 3 | held someone close in the past | She hugged her grandpa goodbye. |
| waved | verb | 1 | 2 | moved a hand to say hello in the past | We waved at the bus driver. |

### g1u10: Compound words

- TEKS: 1.2C.iii, 1.2C.i; CCSS: RF.1.3.e, L.1.2.d
- Typical time of year: May
- Tier: core; 15 words
- Rule for kids: Two small words can join to make a bigger word. Spell each little word, then put them together.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| sunset | noun | 2 | 1 | the time when the sun goes down | We watched the sunset from the porch. |
| cupcake | noun | 2 | 1 | a small cake baked in a cup | I frosted a cupcake for my friend. |
| rainbow | noun | 2 | 1 | colorful bands in the sky after rain | A rainbow stretched over the hills. |
| football | noun | 2 | 2 | a game or ball used in the sport | My dad likes to throw a football. |
| bedroom | noun | 2 | 2 | the room where you sleep | I keep my books in my bedroom. |
| starfish | noun | 2 | 2 | a sea animal shaped like a star | We saw a starfish in the tide pool. |
| backpack | noun | 2 | 2 | a bag carried on your back | I put my lunch in my backpack. |
| popcorn | noun | 2 | 1 | a crunchy snack made from corn kernels | We ate popcorn at the movies. |
| sandbox | noun | 2 | 2 | a box of sand for playing | We dug holes in the sandbox. |
| playground | noun | 2 | 2 | a place with swings and slides | We met at the playground after school. |
| bathtub | noun | 2 | 2 | a big tub for washing | The ducks floated in the bathtub. |
| weekend | noun | 2 | 2 | Saturday and Sunday | On the weekend we go hiking. |
| sunshine | noun | 2 | 2 | light from the sun | The sunshine felt warm on my face. |
| seashell | noun | 2 | 2 | the shell of a sea animal | She collected a seashell on the beach. |
| raincoat | noun | 2 | 2 | a coat that keeps you dry | I wore my raincoat to jump in puddles. |

### g1hf: High-frequency and sight words

- TEKS: 1.2C.iv; CCSS: RF.1.3.g
- Typical time of year: all year
- Tier: hf; 32 words
- Rule for kids: Some words do not follow the rules. Learn them by heart and spell them without sounding out.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| said | verb | 1 | 2 | spoke in the past | Mom said it was time to eat. |
| the | determiner | 1 | 1 | a word that points out a thing | The cat is on the mat. |
| was | verb | 1 | 1 | used for one person or thing in the past | It was a sunny day. |
| are | verb | 1 | 1 | used with we, you and they | You are my best friend. |
| they | pronoun | 1 | 1 | more than one person or thing | They went to the zoo. |
| have | verb | 1 | 1 | to own or hold | I have a red kite. |
| from | preposition | 1 | 1 | starting at a place | The letter came from my aunt. |
| do | verb | 1 | 1 | to carry out an action | I do my homework after school. |
| does | verb | 1 | 3 | a form of do used with he, she and it | She does her chores every day. |
| of | preposition | 1 | 1 | belonging to or made from | I drank a glass of water. |
| want | verb | 1 | 1 | to wish for something | I want a turn on the swing. |
| what | pronoun | 1 | 1 | a word used to ask about something | What is your favorite color? |
| there | adverb | 1 | 2 | in that place | The book is over there. |
| where | adverb | 1 | 2 | in what place | Where did you put your shoes? |
| were | verb | 1 | 2 | used with we, you and they in the past | We were happy to see you. |
| who | pronoun | 1 | 2 | which person | Who wants to play a game? |
| would | verb | 1 | 3 | a form of will used for polite asking | Would you like some juice? |
| could | verb | 1 | 3 | a form of can in the past | I could see the stars. |
| with | preposition | 1 | 1 | together or along side | Come with me to the store. |
| you | pronoun | 1 | 1 | the person I am talking to | I like you. |
| your | pronoun | 1 | 2 | belonging to you | Is this your hat? |
| come | verb | 1 | 2 | to move toward a place | Come and sit by me. |
| some | determiner | 1 | 2 | a little or a few | I ate some grapes. |
| give | verb | 1 | 2 | to hand something to another person | I will give you a hug. |
| live | verb | 1 | 2 | to have your home in a place | We live near a pond. |
| once | adverb | 1 | 3 | one time | I rode the horse once. |
| many | determiner | 2 | 2 | a large number of | We saw many birds at the lake. |
| very | adverb | 2 | 2 | a lot or extremely | The soup is very hot. |
| then | adverb | 1 | 1 | after that | First we ate, then we played. |
| put | verb | 1 | 1 | to place something somewhere | Put your coat on the hook. |
| look | verb | 1 | 1 | to use your eyes to see | Look at the rainbow! |
| little | adjective | 2 | 2 | small in size | A little duck followed its mom. |

### g1bee: Bee challenge words

- TEKS: 1.2C.i, 1.2C.iii; CCSS: L.1.2.e
- Typical time of year: all year
- Tier: bee; 15 words
- Rule for kids: These are longer words for a spelling bee. Break them into syllables to spell them.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| elephant | noun | 3 | 3 | a huge gray animal with a trunk | An elephant sprayed water with its trunk. |
| dinosaur | noun | 3 | 3 | a giant reptile that lived long ago | We saw a dinosaur skeleton at the museum. |
| umbrella | noun | 3 | 3 | a cover that keeps you dry in the rain | I opened my umbrella in the rain. |
| pumpkin | noun | 2 | 3 | a large orange fruit used for pies | We carved a pumpkin for fall. |
| kitten | noun | 2 | 2 | a baby cat | The kitten chased a ball of yarn. |
| monkey | noun | 2 | 3 | an animal that climbs and swings in trees | A monkey swung from the branch. |
| giraffe | noun | 2 | 3 | the tallest animal in the world | The giraffe reached for leaves. |
| penguin | noun | 2 | 3 | a black and white bird that swims | The penguin slid on its belly. |
| picnic | noun | 2 | 2 | a meal eaten outside | We had a picnic by the river. |
| chicken | noun | 2 | 2 | a farm bird that lays eggs | The chicken laid an egg this morning. |
| spider | noun | 2 | 2 | a small animal with eight legs | The spider spun a web. |
| sandwich | noun | 2 | 3 | food made with filling between bread | I made a ham sandwich. |
| pencil | noun | 2 | 3 | a tool for writing and drawing | Sharpen your pencil before the test. |
| window | noun | 2 | 2 | a glass opening in a wall | I looked out the window. |
| yellow | adjective | 2 | 3 | the color of a lemon | The duck was yellow and fluffy. |

## Grade 2

Focus: Silent letters; compound words, contractions; multisyllabic words with multiple sound-spelling patterns; syllable division with double consonants; prefixes un- re- dis-; endings -s -es -ed -ing -er -est.

### g2u1: Long vowels: VCe and vowel-team review

- TEKS: 2.2C.iii (review of 1.2C.i); CCSS: RF.2.3.a, RF.2.3.b, L.2.2.d
- Typical time of year: Aug-Sep
- Tier: core; 16 words
- Rule for kids: Long vowels can be spelled with a silent e (slide) or with a vowel team (train, float). Pick the pattern that fits the word you hear.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| brave | adjective | 1 | 2 | not afraid | The brave firefighter climbed the ladder. |
| globe | noun | 1 | 2 | a round map of the earth | I spun the globe and pointed to Texas. |
| stripe | noun | 1 | 2 | a long narrow band of color | The zebra has a black stripe on its leg. |
| slide | verb | 1 | 1 | to glide smoothly | We slide on the ice in winter. |
| smoke | noun | 1 | 2 | gray cloud from a fire | Smoke rose from the campfire. |
| grape | noun | 1 | 1 | a small round fruit that grows in bunches | I packed a grape in my lunch. |
| flute | noun | 1 | 2 | a thin musical instrument you blow into | She plays the flute in the band. |
| prize | noun | 1 | 2 | a reward for winning | He won first prize at the fair. |
| chase | verb | 1 | 2 | to run after something | The puppy likes to chase the ball. |
| stone | noun | 1 | 2 | a small piece of rock | I skipped a stone across the creek. |
| trail | noun | 1 | 2 | a path through the woods | We hiked along the trail. |
| paint | noun | 1 | 1 | colored liquid for making pictures | I mixed blue paint with yellow. |
| dream | noun | 1 | 2 | pictures in your mind while you sleep | I had a dream about flying. |
| float | verb | 1 | 2 | to rest on top of water | A leaf can float on the pond. |
| queen | noun | 1 | 2 | a woman who rules a country | The queen wore a golden crown. |
| thief | noun | 1 | 3 | a person who steals | The detective caught the thief in the story. |

### g2u2: Diphthongs and variant vowels (oi/oy, ou/ow, aw/au, oo)

- TEKS: 2.2C.iii; CCSS: RF.2.3.b, L.2.2.d
- Typical time of year: Sep-Oct
- Tier: core; 18 words
- Rule for kids: Some vowel pairs glide: oi and oy say /oy/, ou and ow say /ow/, aw and au say /aw/. Use oi, ou and au in the middle, and oy, ow and aw at the end.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| coin | noun | 1 | 1 | a small round piece of money | I found a coin on the sidewalk. |
| soil | noun | 1 | 2 | the dirt where plants grow | The seeds grow in rich soil. |
| boy | noun | 1 | 1 | a young male child | The boy kicked the ball. |
| toy | noun | 1 | 1 | something to play with | My favorite toy is a wooden train. |
| cloud | noun | 1 | 2 | a white or gray puff in the sky | A cloud covered the sun. |
| house | noun | 1 | 1 | a building where people live | Our house has a red door. |
| mouse | noun | 1 | 2 | a small animal with a long tail | A mouse scurried across the floor. |
| brown | adjective | 1 | 1 | the color of chocolate | The bear had brown fur. |
| clown | noun | 1 | 2 | a funny person in a costume | The clown made us laugh. |
| crown | noun | 1 | 2 | a gold hat worn by kings and queens | The queen wore a sparkly crown. |
| paw | noun | 1 | 1 | an animal's foot with claws | The puppy lifted its paw. |
| saw | noun | 1 | 2 | a tool with sharp teeth for cutting wood | Dad cut the board with a saw. |
| lawn | noun | 1 | 2 | grass around a house | We mowed the lawn on Saturday. |
| pause | verb | 1 | 3 | to stop for a short time | Pause the video so we can talk. |
| cook | verb | 1 | 1 | to make food hot and ready to eat | I like to cook pancakes with Dad. |
| foot | noun | 1 | 1 | the part at the bottom of your leg | I hurt my foot kicking the ball. |
| wood | noun | 1 | 2 | the hard part of a tree | The table was made of wood. |
| spoon | noun | 1 | 2 | a tool for eating soup | Use a spoon to eat your cereal. |

### g2u3: R-controlled vowels (ar, or, er, ir, ur, ear, air)

- TEKS: 2.2C.iii; CCSS: RF.2.3.b, L.2.2.d
- Typical time of year: Oct
- Tier: core; 16 words
- Rule for kids: A vowel followed by r makes a new sound. er, ir and ur sound the same, so you have to remember which one the word uses.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| shark | noun | 1 | 1 | a big fish with sharp teeth | A shark swam past the divers. |
| yard | noun | 1 | 1 | the grass area around a house | We play catch in the yard. |
| sport | noun | 1 | 2 | a game like soccer or baseball | Soccer is my favorite sport. |
| north | noun | 1 | 2 | the direction toward the top of a map | Geese fly north in spring. |
| thorn | noun | 1 | 3 | a sharp point on a rose stem | Be careful of the thorn on the rose. |
| fur | noun | 1 | 2 | the soft hair on an animal | The kitten has soft gray fur. |
| third | adjective | 1 | 2 | number three in order | She finished in third place. |
| stir | verb | 1 | 2 | to mix with a spoon | Stir the soup so it does not stick. |
| purple | adjective | 2 | 2 | the color of grapes | She painted a purple flower. |
| dirt | noun | 1 | 2 | loose earth or soil | The dog dug in the dirt. |
| hurt | verb | 1 | 2 | to feel pain | I hurt my knee falling off my bike. |
| chair | noun | 1 | 1 | a seat with a back | Please pull in your chair. |
| stairs | plural noun | 1 | 2 | steps that go up or down | We climbed the stairs to the attic. |
| hair | noun | 1 | 1 | the strands that grow on your head | She braided her hair. |
| earth | noun | 1 | 2 | the planet we live on | The earth travels around the sun. |
| pearl | noun | 1 | 3 | a smooth round gem from an oyster | The necklace had a white pearl. |

### g2u4: Silent letters (kn, wr, gn, mb)

- TEKS: 2.2C.i; CCSS: RF.2.3.f, L.2.2.d
- Typical time of year: Nov
- Tier: core; 16 words
- Rule for kids: Some letters are quiet. The k in kn, the w in wr, the g in gn, and the b after m do not make a sound, but they are still there when we spell.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| knee | noun | 1 | 1 | the joint in the middle of your leg | I scraped my knee on the playground. |
| knife | noun | 1 | 2 | a sharp tool for cutting | Use a butter knife to spread the jam. |
| knot | noun | 1 | 2 | a tied loop in rope or string | She tied a knot in the rope. |
| knock | verb | 1 | 2 | to tap on a door | Please knock before you come in. |
| know | verb | 1 | 2 | to understand or be sure of | I know the answer. |
| wrap | verb | 1 | 2 | to cover with paper | Help me wrap the gift. |
| write | verb | 1 | 2 | to make letters on paper | I write a letter to my grandma. |
| wrist | noun | 1 | 2 | the joint between your hand and arm | She wore a bracelet on her wrist. |
| wrong | adjective | 1 | 2 | not right | I picked the wrong door. |
| gnat | noun | 1 | 3 | a tiny flying bug | A gnat buzzed near my ear. |
| gnome | noun | 1 | 3 | a tiny garden figure with a pointy hat | A gnome sat in the garden. |
| comb | noun | 1 | 2 | a tool for tidying hair | I used a comb to fix my hair. |
| lamb | noun | 1 | 2 | a baby sheep | The lamb followed its mother. |
| thumb | noun | 1 | 2 | the short, thick finger on your hand | I gave a thumb up. |
| climb | verb | 1 | 2 | to go up using hands and feet | We climb the tree after school. |
| crumb | noun | 1 | 3 | a tiny piece of bread | A crumb fell on the floor. |

### g2u5: Soft c and soft g

- TEKS: 2.2C.iii; CCSS: RF.2.3.b, L.2.2.d
- Typical time of year: Nov-Dec
- Tier: core; 16 words
- Rule for kids: When c or g is followed by e, i or y, it often turns soft. c says /s/ like in city and g says /j/ like in giant.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| city | noun | 2 | 1 | a large town | We visited a big city. |
| circle | noun | 2 | 2 | a perfectly round shape | The children sat in a circle. |
| face | noun | 1 | 1 | the front of your head | She had a big smile on her face. |
| mice | plural noun | 1 | 2 | more than one mouse | Two mice ran into the hole. |
| race | noun | 1 | 1 | a contest to see who is fastest | I won the race at field day. |
| fence | noun | 1 | 2 | a barrier around a yard | The horse stood behind the fence. |
| ice | noun | 1 | 1 | frozen water | I put ice in my juice. |
| dance | verb | 1 | 1 | to move to music | We dance at the party. |
| giant | adjective | 2 | 2 | very very big | A giant pumpkin sat in the garden. |
| gentle | adjective | 2 | 2 | soft and kind | Be gentle with the baby bunny. |
| gym | noun | 1 | 2 | a big room for exercise | We play games in the gym. |
| page | noun | 1 | 1 | one side of a sheet in a book | Turn the page. |
| cage | noun | 1 | 2 | a closed place for a pet bird | The parrot sat in a cage. |
| stage | noun | 1 | 2 | a raised platform for performers | The singers walked onto the stage. |
| huge | adjective | 1 | 2 | very big | A huge wave rolled in. |
| change | verb | 1 | 2 | to make different | I want to change my shirt. |

### g2u6: Contractions

- TEKS: 2.2C.ii; CCSS: L.2.2.c
- Typical time of year: Dec-Jan
- Tier: core; 16 words
- Rule for kids: A contraction squeezes two words into one. The apostrophe shows where letters are missing: do not becomes don't.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| can't | verb | 1 | 1 | short for cannot | I can't reach the top shelf. |
| don't | verb | 1 | 1 | short for do not | Don't forget your lunch. |
| isn't | verb | 2 | 2 | short for is not | It isn't raining today. |
| I'm | pronoun | 1 | 1 | short for I am | I'm ready to go outside. |
| it's | pronoun | 1 | 1 | short for it is | It's time for recess. |
| we're | pronoun | 1 | 2 | short for we are | We're going to the zoo. |
| they're | pronoun | 1 | 3 | short for they are | They're waiting by the gate. |
| let's | verb | 1 | 2 | short for let us | Let's build a fort. |
| I'll | pronoun | 1 | 2 | short for I will | I'll help you clean up. |
| she's | pronoun | 1 | 2 | short for she is | She's my best friend. |
| didn't | verb | 2 | 2 | short for did not | I didn't see the bus. |
| won't | verb | 1 | 3 | short for will not | The car won't start. |
| you're | pronoun | 1 | 2 | short for you are | You're a great helper. |
| that's | pronoun | 1 | 2 | short for that is | That's my favorite song. |
| wasn't | verb | 2 | 2 | short for was not | It wasn't very far. |
| I've | pronoun | 1 | 2 | short for I have | I've finished my homework. |

### g2u7: Compound words

- TEKS: 2.2C.ii; CCSS: RF.2.3.d, L.2.2.d
- Typical time of year: Jan
- Tier: core; 16 words
- Rule for kids: Join two whole words with no letters lost. Say each part, then write both parts together.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| airplane | noun | 2 | 2 | a flying machine with wings | The airplane landed at the airport. |
| birthday | noun | 2 | 1 | the day you were born each year | My birthday is in July. |
| butterfly | noun | 3 | 2 | an insect with colorful wings | A butterfly landed on my hand. |
| classroom | noun | 2 | 2 | a room where students learn | Our classroom has a reading corner. |
| cowboy | noun | 2 | 2 | a person who works with cattle | The cowboy rode his horse. |
| doghouse | noun | 2 | 2 | a little house for a dog | The puppy slept in the doghouse. |
| driveway | noun | 2 | 2 | a short road to a house | I shot baskets in the driveway. |
| grandmother | noun | 3 | 3 | the mother of your mom or dad | My grandmother tells funny stories. |
| homework | noun | 2 | 2 | schoolwork you do at home | I finish my homework before dinner. |
| inside | adverb | 2 | 1 | in the indoors | Let's play inside today. |
| lighthouse | noun | 2 | 3 | a tall tower with a light for ships | The lighthouse guided the boats. |
| notebook | noun | 2 | 2 | a book of blank pages for writing | I wrote my story in a notebook. |
| outside | adverb | 2 | 1 | out of doors | We ate lunch outside. |
| sidewalk | noun | 2 | 2 | a path for walking next to a street | We chalked pictures on the sidewalk. |
| snowflake | noun | 2 | 2 | a tiny crystal of snow | A snowflake landed on my mitten. |
| treehouse | noun | 2 | 2 | a small house built in a tree | We built a treehouse in the oak. |

### g2u8: Endings -s/-es/-ies, -ed and -ing (drop e, double, y to i)

- TEKS: 2.2C.v; CCSS: RF.2.3.e, L.2.1.b, L.2.2.d
- Typical time of year: Feb-Mar
- Tier: core; 16 words
- Rule for kids: Before adding -ed or -ing, check the base word. Drop a silent e (hope, hoping). Double the last letter after one short vowel (stop, stopped). Change y to i before -es or -ed (baby, babies).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| babies | plural noun | 2 | 2 | more than one baby | The babies napped in their cribs. |
| puppies | plural noun | 2 | 2 | more than one puppy | The puppies tumbled in the grass. |
| wishes | plural noun | 2 | 2 | hopes for good things | She made three wishes. |
| foxes | plural noun | 2 | 2 | more than one fox | Two foxes ran through the field. |
| stopped | verb | 1 | 3 | ended a movement | The bus stopped at the corner. |
| planned | verb | 1 | 3 | made a plan | We planned a surprise party. |
| hoped | verb | 1 | 2 | wished for something | I hoped it would snow. |
| danced | verb | 1 | 2 | moved to music | They danced all evening. |
| smiling | verb | 2 | 2 | showing a happy face | She was smiling at the camera. |
| hiking | verb | 2 | 2 | walking in nature | We are hiking up the hill. |
| carried | verb | 2 | 3 | held and moved something | He carried the groceries inside. |
| cried | verb | 1 | 2 | let tears fall | The baby cried until Mom came. |
| studied | verb | 2 | 3 | worked at learning something | I studied my spelling words. |
| hurried | verb | 2 | 3 | moved very fast | She hurried to catch the bus. |
| copying | verb | 3 | 3 | making the same as something | He is copying the words from the board. |
| trying | verb | 2 | 2 | making an effort | I am trying my best. |

### g2u9: Endings -er and -est (comparing)

- TEKS: 2.2C.v; CCSS: L.2.2.d
- Typical time of year: Mar
- Tier: core; 16 words
- Rule for kids: Add -er to compare two things and -est to compare three or more. Watch for double letters (big, bigger) and y to i (happy, happier).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| taller | adjective | 2 | 1 | more tall than another | My brother is taller than me. |
| tallest | adjective | 2 | 2 | most tall of all | That is the tallest tree in the park. |
| faster | adjective | 2 | 1 | more quick than another | A cheetah is faster than a horse. |
| fastest | adjective | 2 | 2 | most quick of all | She is the fastest runner on the team. |
| bigger | adjective | 2 | 2 | larger than another | The elephant is bigger than the dog. |
| biggest | adjective | 2 | 3 | largest of all | This is the biggest pumpkin I have ever seen. |
| happier | adjective | 3 | 3 | more glad than another | I am happier when the sun is out. |
| happiest | adjective | 3 | 3 | most glad of all | It was the happiest day of my life. |
| smaller | adjective | 2 | 1 | less big than another | The kitten is smaller than the cat. |
| smallest | adjective | 2 | 2 | least big of all | The smallest puppy was the sweetest. |
| louder | adjective | 2 | 2 | with more noise | The drum was louder than the flute. |
| loudest | adjective | 2 | 2 | with the most noise | The thunder was the loudest sound. |
| hotter | adjective | 2 | 3 | more warm than another | Summer is hotter than spring. |
| hottest | adjective | 2 | 3 | most warm of all | July is the hottest month. |
| nicer | adjective | 2 | 2 | more kind than another | She was nicer than anyone I know. |
| nicest | adjective | 2 | 3 | most kind of all | He is the nicest boy in class. |

### g2u10: Prefixes un-, re-, dis-

- TEKS: 2.2C.v; CCSS: L.2.4.b, L.2.4.c
- Typical time of year: Apr
- Tier: core; 16 words
- Rule for kids: A prefix goes at the front and changes the meaning. un- means not, re- means again, and dis- means the opposite. The base word keeps all its letters.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| unhappy | adjective | 3 | 2 | not glad | He was unhappy when it rained. |
| unfair | adjective | 2 | 2 | not just or equal | It is unfair to cut in line. |
| unlock | verb | 2 | 2 | to open a lock | Use the key to unlock the door. |
| unkind | adjective | 2 | 2 | not nice | It is unkind to call people names. |
| unsafe | adjective | 2 | 2 | not free from danger | It is unsafe to run on the ice. |
| undo | verb | 2 | 2 | to take apart or reverse | Can you undo the knot? |
| redo | verb | 2 | 2 | to do again | I had to redo my math. |
| rewrite | verb | 2 | 2 | to write again | Please rewrite your story with neat letters. |
| replay | verb | 2 | 2 | to play again | Let's replay the song. |
| rebuild | verb | 2 | 3 | to build again | The castle fell, so we rebuild it. |
| reread | verb | 2 | 3 | to read again | I like to reread my favorite book. |
| retell | verb | 2 | 2 | to tell again | Retell the story in your own words. |
| disagree | verb | 3 | 3 | to have a different opinion | We disagree about the best ice cream flavor. |
| dislike | verb | 2 | 2 | to not enjoy | I dislike loud noises. |
| disappear | verb | 3 | 3 | to go out of sight | The sun will disappear behind the hill. |
| discover | verb | 3 | 3 | to find something new | We discover new shells at the beach. |

### g2u11: Two-syllable words: VCCV and double consonants

- TEKS: 2.2C.iv; CCSS: RF.2.3.c, L.2.2.d
- Typical time of year: May
- Tier: core; 16 words
- Rule for kids: Split a two-syllable word between two consonants: rab-bit, but-ter. If the middle letters are doubled, each syllable gets one. Clap each beat to check.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| rabbit | noun | 2 | 1 | a furry animal with long ears | A rabbit hopped across the yard. |
| butter | noun | 2 | 1 | a soft yellow spread made from cream | I spread butter on my toast. |
| ladder | noun | 2 | 2 | a tool for climbing up high | He climbed the ladder to the roof. |
| pillow | noun | 2 | 2 | a soft cushion for your head | I hugged my pillow and fell asleep. |
| puppet | noun | 2 | 2 | a doll you move with your hand | She made a puppet from a sock. |
| muffin | noun | 2 | 2 | a small round cake for breakfast | I ate a blueberry muffin. |
| mitten | noun | 2 | 2 | a warm covering for your hand | I lost a mitten in the snow. |
| button | noun | 2 | 2 | a small disk that holds clothes closed | A button fell off my coat. |
| summer | noun | 2 | 1 | the warm season after spring | We swim in the summer. |
| letter | noun | 2 | 2 | a message you mail | I wrote a letter to my cousin. |
| dinner | noun | 2 | 1 | the evening meal | We eat dinner at six. |
| funny | adjective | 2 | 1 | something that makes you laugh | The joke was so funny. |
| happen | verb | 2 | 2 | to take place | What will happen next in the story? |
| pepper | noun | 2 | 2 | a spice that makes food zesty | She sprinkled pepper on her eggs. |
| tunnel | noun | 2 | 2 | a path that goes under or through something | The train rushed through the tunnel. |
| basket | noun | 2 | 2 | a container woven from reeds | We gathered apples in a basket. |

### g2hf: High-frequency and sight words

- TEKS: 2.2C.iii; CCSS: RF.2.3.f, L.2.2.d
- Typical time of year: all year
- Tier: hf; 31 words
- Rule for kids: These words do not play by the sound rules. Practice them until you can spell them without thinking.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| because | conjunction | 2 | 3 | for the reason that | I wore a coat because it was cold. |
| before | preposition | 2 | 2 | earlier than | Wash your hands before lunch. |
| always | adverb | 2 | 2 | every time | She always brushes her teeth. |
| around | preposition | 2 | 2 | on every side of | We ran around the track. |
| been | verb | 1 | 2 | a form of be used after have | I have been to the beach. |
| both | pronoun | 1 | 2 | the two together | Both of my brothers play soccer. |
| buy | verb | 1 | 3 | to get by paying money | I will buy an apple. |
| call | verb | 1 | 1 | to phone someone or shout out | Please call me when you get home. |
| first | adjective | 1 | 1 | before all others | I was first in line. |
| found | verb | 1 | 1 | came upon something | I found a shiny penny. |
| goes | verb | 1 | 2 | moves from one place to another | The bus goes to school. |
| going | verb | 2 | 1 | moving toward a place | We are going to the park. |
| great | adjective | 1 | 2 | very good | We had a great time. |
| laugh | verb | 1 | 3 | to make a happy sound | The joke made me laugh. |
| their | pronoun | 1 | 3 | belonging to them | The kids put on their hats. |
| these | pronoun | 1 | 2 | the ones near me | I like these shoes. |
| those | pronoun | 1 | 2 | the ones over there | Those birds are blue jays. |
| together | adverb | 3 | 3 | with each other | We worked together. |
| through | preposition | 1 | 3 | from one side to the other | The train goes through a tunnel. |
| whole | adjective | 1 | 3 | all of something | She ate the whole sandwich. |
| pretty | adjective | 2 | 2 | nice to look at | The garden looks pretty today. |
| again | adverb | 2 | 2 | one more time | Let's play that game again. |
| any | determiner | 2 | 2 | one or some | Do you have any crayons? |
| friend | noun | 1 | 3 | someone you like and trust | My friend lives next door. |
| people | plural noun | 2 | 3 | many persons | Many people came to the parade. |
| thought | verb | 1 | 3 | had an idea in your mind | I thought of a good idea. |
| school | noun | 1 | 2 | a place where children learn | We walk to school every day. |
| every | determiner | 2 | 2 | each one | Every student got a turn. |
| after | preposition | 2 | 2 | later than | We play outside after lunch. |
| never | adverb | 2 | 2 | not ever | I never give up. |
| enough | adjective | 2 | 3 | as much as needed | We have enough chairs for everyone. |

### g2bee: Bee challenge words

- TEKS: 2.2C.iii, 2.2C.iv; CCSS: L.2.2.e
- Typical time of year: all year
- Tier: bee; 19 words
- Rule for kids: These tougher words have several syllables or tricky parts. Say each syllable out loud as you spell.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| adventure | noun | 3 | 3 | an exciting trip or event | The trail was a big adventure. |
| favorite | adjective | 3 | 3 | liked the best | Blue is my favorite color. |
| beautiful | adjective | 3 | 3 | very pretty | The sunset was beautiful. |
| enormous | adjective | 3 | 3 | very, very large | An enormous whale swam by. |
| dangerous | adjective | 3 | 3 | likely to cause harm | The icy road was dangerous. |
| vacation | noun | 3 | 3 | time away from school or work | We went to the beach on vacation. |
| library | noun | 3 | 3 | a place with many books to borrow | I checked out a book at the library. |
| tomorrow | noun | 3 | 3 | the day after today | Tomorrow is Saturday. |
| castle | noun | 2 | 2 | a large stone home for kings and queens | The knight lived in a castle. |
| cactus | noun | 2 | 3 | a prickly desert plant | A cactus grows in the Texas desert. |
| volcano | noun | 3 | 3 | a mountain that can erupt | Lava flowed from the volcano. |
| treasure | noun | 2 | 3 | gold, jewels or something precious | The pirates buried the treasure. |
| chocolate | noun | 3 | 3 | a sweet brown candy | I ate a chocolate chip cookie. |
| crocodile | noun | 3 | 3 | a large reptile with sharp teeth | A crocodile floated in the river. |
| fireworks | plural noun | 2 | 3 | colorful explosions in the night sky | We watched fireworks on the Fourth of July. |
| imagine | verb | 3 | 3 | to picture something in your mind | Imagine a castle made of candy. |
| remember | verb | 3 | 3 | to keep in your mind | Remember to bring your lunch. |
| excellent | adjective | 3 | 3 | extremely good | You did an excellent job. |
| mountain | noun | 2 | 3 | a very tall hill | We hiked up the mountain. |

## Grade 3

Focus: Multisyllabic words by syllable type (closed, open, VCe, vowel team, r-controlled, final stable), homophones, contractions, compound words, syllable division, prefixes, suffixes and base-word changes.

### g3u1: Closed syllables in longer words

- TEKS: 3.2B.i, 3.2B.iv; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Aug-Sep
- Tier: core; 15 words
- Rule for kids: A closed syllable ends in a consonant, so the vowel is short: nap-kin, mag-net. Break the word into beats and spell each one.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| napkin | noun | 2 | 1 | a cloth or paper for wiping your mouth | I put a napkin on my lap. |
| magnet | noun | 2 | 2 | a metal piece that pulls iron toward it | The magnet stuck to the fridge. |
| helmet | noun | 2 | 2 | a hard hat that protects your head | Always wear a helmet when you ride a bike. |
| insect | noun | 2 | 2 | a small animal with six legs | An insect crawled up the stem. |
| problem | noun | 2 | 2 | something that needs to be solved | We solved the math problem together. |
| contest | noun | 2 | 2 | a game where people try to win | She entered the spelling contest. |
| trumpet | noun | 2 | 2 | a brass instrument you blow into | He played a loud note on his trumpet. |
| tablet | noun | 2 | 2 | a flat computer you touch | I read a book on my tablet. |
| nickel | noun | 2 | 2 | a five-cent coin | A nickel is worth five cents. |
| ticket | noun | 2 | 2 | a card that lets you enter | We bought a ticket for the show. |
| rocket | noun | 2 | 2 | a spaceship shaped like a tube | The rocket blasted into space. |
| whisper | verb | 2 | 2 | to speak very softly | Please whisper in the library. |
| lantern | noun | 2 | 3 | a light you can carry | We hung a lantern from the tree. |
| sandal | noun | 2 | 2 | an open summer shoe | I lost a sandal at the pool. |
| fabric | noun | 2 | 3 | cloth used to make clothes | She picked a soft fabric for the quilt. |

### g3u2: Open syllables in longer words

- TEKS: 3.2B.i, 3.2B.iv; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Sep
- Tier: core; 15 words
- Rule for kids: An open syllable ends in a vowel, so the vowel says its name: pa-per, mu-sic. Listen for the long vowel at the end of the first syllable.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| paper | noun | 2 | 1 | thin sheets used for writing | I drew a picture on paper. |
| music | noun | 2 | 1 | sounds made by instruments or voices | We listened to music in class. |
| pilot | noun | 2 | 2 | a person who flies an airplane | The pilot waved from the cockpit. |
| frozen | adjective | 2 | 2 | turned to ice | The pond was frozen solid. |
| silent | adjective | 2 | 2 | making no sound | The room was silent during the test. |
| open | adjective | 2 | 1 | not closed | Please keep the door open. |
| hotel | noun | 2 | 2 | a building with rooms for travelers | We stayed in a hotel by the ocean. |
| label | noun | 2 | 2 | a tag that tells what something is | I wrote my name on the label. |
| human | noun | 2 | 3 | a person | Every human needs water. |
| moment | noun | 2 | 2 | a very short time | Wait a moment, please. |
| tulip | noun | 2 | 3 | a spring flower shaped like a cup | A red tulip bloomed by the porch. |
| unit | noun | 2 | 3 | one part of a larger whole | Our class finished the math unit. |
| siren | noun | 2 | 3 | a loud warning sound | We heard a siren down the street. |
| bacon | noun | 2 | 2 | salty strips of meat for breakfast | The kitchen smelled like bacon. |
| zebra | noun | 2 | 2 | a striped animal from Africa | The zebra grazed on the grass. |

### g3u3: VCe syllables in longer words

- TEKS: 3.2B.i; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Oct
- Tier: core; 15 words
- Rule for kids: A syllable with silent e still says its long vowel name: re-mote, ex-plode. Keep the silent e at the end of that syllable.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| reptile | noun | 2 | 3 | a cold-blooded animal with scales | A snake is a reptile. |
| costume | noun | 2 | 2 | clothes worn for a play or party | My costume was a pirate. |
| trombone | noun | 2 | 3 | a brass instrument with a slide | He plays the trombone in the band. |
| mistake | noun | 2 | 2 | something that is not right | It was a small mistake. |
| pancake | noun | 2 | 1 | a flat breakfast cake | Dad flipped a pancake. |
| explode | verb | 2 | 3 | to burst with a loud noise | The balloon will explode if you blow too hard. |
| invite | verb | 2 | 2 | to ask someone to come | I will invite my friends to my party. |
| escape | verb | 2 | 3 | to get away | The rabbit tried to escape. |
| complete | verb | 2 | 3 | to finish | I will complete my homework. |
| include | verb | 2 | 3 | to have as a part | Please include your name on the paper. |
| surprise | noun | 2 | 2 | something you did not expect | The party was a big surprise. |
| compete | verb | 2 | 3 | to try to win | They compete in the race every year. |
| campfire | noun | 2 | 2 | an outdoor fire for cooking and warmth | We roasted marshmallows over the campfire. |
| concrete | noun | 2 | 3 | a hard gray building material | The sidewalk is made of concrete. |
| provide | verb | 2 | 3 | to give what is needed | Farmers provide food for us. |

### g3u4: Vowel teams, digraphs and diphthongs in longer words

- TEKS: 3.2B.i; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Oct-Nov
- Tier: core; 15 words
- Rule for kids: Vowel teams stay together in one syllable: mail-box, af-ter-noon. Remember which team makes the sound, like ai, ea, oa, oo, oi, ou.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| mailbox | noun | 2 | 1 | a box where letters are delivered | The letter arrived in the mailbox. |
| seaweed | noun | 2 | 2 | a plant that grows in the ocean | Seaweed washed up on the shore. |
| peanut | noun | 2 | 1 | a small nut that grows underground | I like a peanut butter sandwich. |
| teacher | noun | 2 | 1 | a person who helps students learn | My teacher reads to us after lunch. |
| cartoon | noun | 2 | 2 | a funny drawn show | We watched a cartoon on Saturday. |
| sailboat | noun | 2 | 2 | a boat with sails | The sailboat floated on the lake. |
| destroy | verb | 2 | 3 | to ruin completely | Waves can destroy a sandcastle. |
| appoint | verb | 2 | 3 | to choose for a job | The class will appoint a leader. |
| rooster | noun | 2 | 2 | a male chicken that crows | The rooster crowed at sunrise. |
| afternoon | noun | 3 | 2 | the part of the day after noon | We play outside in the afternoon. |
| balloon | noun | 2 | 2 | a rubber bag filled with air | The balloon floated into the sky. |
| mushroom | noun | 2 | 2 | a fungus that grows in damp places | A mushroom popped up after the rain. |
| outdoors | adverb | 2 | 2 | outside | We eat outdoors in spring. |
| toaster | noun | 2 | 2 | a machine that browns bread | The toaster popped up the bread. |
| reason | noun | 2 | 2 | why something happens | Tell me the reason you are late. |

### g3u5: R-controlled syllables in longer words

- TEKS: 3.2B.i; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Nov
- Tier: core; 16 words
- Rule for kids: In an r-controlled syllable, the vowel and r stay together: gar-den, mon-ster. Remember ar, or, er, ir, ur.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| garden | noun | 2 | 1 | a place where plants grow | We planted tomatoes in the garden. |
| market | noun | 2 | 1 | a place to buy food | We bought apples at the market. |
| corner | noun | 2 | 2 | where two streets or walls meet | The bus stops at the corner. |
| monster | noun | 2 | 2 | a make-believe scary creature | The monster in the book was silly. |
| forest | noun | 2 | 2 | a large area of trees | Deer live in the forest. |
| thunder | noun | 2 | 2 | the loud sound after lightning | Thunder shook the windows. |
| number | noun | 2 | 1 | a word or symbol for how many | My favorite number is seven. |
| winter | noun | 2 | 1 | the coldest season | We drink hot cocoa in winter. |
| farmer | noun | 2 | 2 | a person who grows crops or animals | The farmer fed the cows. |
| turkey | noun | 2 | 2 | a large bird eaten at Thanksgiving | We had turkey for dinner. |
| circus | noun | 2 | 2 | a show with clowns and animals | We saw an elephant at the circus. |
| perfect | adjective | 2 | 2 | without any mistakes | She got a perfect score. |
| mermaid | noun | 2 | 2 | a make-believe sea girl with a fish tail | A mermaid sang in the story. |
| burrow | noun | 2 | 3 | a hole dug by an animal | The rabbit hid in its burrow. |
| scorpion | noun | 2 | 3 | a desert animal with a stinging tail | A scorpion crept under the rock. |
| artist | noun | 2 | 2 | a person who makes pictures | The artist painted a sunset. |

### g3u6: Final stable syllables (consonant-le)

- TEKS: 3.2B.i; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Nov-Dec
- Tier: core; 16 words
- Rule for kids: Many words end with a consonant plus le: ta-ble, bub-ble. The last syllable is its own beat, and the vowel before it follows the rules.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| table | noun | 2 | 1 | a piece of furniture with a flat top | We eat dinner at the table. |
| apple | noun | 2 | 1 | a round red or green fruit | I ate a crisp apple. |
| bubble | noun | 2 | 2 | a thin ball of soap and air | I blew a bubble from the wand. |
| candle | noun | 2 | 2 | a stick of wax with a flame | She lit a candle on the cake. |
| puzzle | noun | 2 | 2 | a game you put together | We finished the puzzle in an hour. |
| turtle | noun | 2 | 2 | a slow reptile with a shell | A turtle sunned itself on a log. |
| needle | noun | 2 | 2 | a thin sewing tool | She threaded the needle. |
| giggle | verb | 2 | 2 | to laugh in a silly way | The baby began to giggle. |
| bottle | noun | 2 | 2 | a container for drinks | He filled his water bottle. |
| simple | adjective | 2 | 2 | easy to do or understand | The directions were simple. |
| jungle | noun | 2 | 2 | a thick tropical forest | Monkeys swing through the jungle. |
| middle | noun | 2 | 2 | the center | Stand in the middle of the line. |
| uncle | noun | 2 | 2 | your parent's brother | My uncle took us fishing. |
| bicycle | noun | 3 | 3 | a two-wheel ride with pedals | I rode my bicycle around the block. |
| sparkle | verb | 2 | 2 | to shine with tiny flashes | Stars sparkle in the night. |
| wiggle | verb | 2 | 2 | to move back and forth | I wiggle my toes in the sand. |

### g3u7: Homophones, set 1

- TEKS: 3.2B.ii; CCSS: L.3.2.f, L.3.4.d
- Typical time of year: Dec
- Tier: core; 15 words
- Rule for kids: Homophones sound alike but have different spellings and meanings. Use the meaning in the sentence to choose the right one.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| ate | verb | 1 | 1 | had a meal | We ate lunch outside. |
| eight | noun | 1 | 1 | the number after seven | I have eight crayons. |
| hear | verb | 1 | 1 | to notice with your ears | I can hear the birds sing. |
| flour | noun | 1 | 2 | powder used for baking | Mom used flour to bake bread. |
| flower | noun | 2 | 1 | the colorful part of a plant | A yellow flower grew by the fence. |
| knight | noun | 1 | 3 | a soldier from the Middle Ages | The knight rode a white horse. |
| night | noun | 1 | 1 | the dark part of the day | The stars come out at night. |
| sale | noun | 1 | 2 | a time when things cost less | The store had a sale on shoes. |
| sail | verb | 1 | 2 | to travel on a boat with sheets of cloth | We sail on the lake in summer. |
| plain | adjective | 1 | 2 | simple, not fancy | She wore a plain white shirt. |
| plane | noun | 1 | 1 | a machine that flies | The plane flew above the clouds. |
| steal | verb | 1 | 2 | to take what is not yours | It is wrong to steal. |
| steel | noun | 1 | 3 | a strong metal | The bridge is made of steel. |
| hole | noun | 1 | 1 | an opening in something | The puppy dug a hole. |
| right | adjective | 1 | 2 | correct | Your answer is right. |

### g3u8: Homophones, set 2

- TEKS: 3.2B.ii; CCSS: L.3.2.f, L.3.4.d
- Typical time of year: Dec-Jan
- Tier: core; 17 words
- Rule for kids: More sound-alike words. Picture the meaning first, then pick the spelling that matches it.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| dear | adjective | 1 | 1 | loved or valued | Dear Grandma, thank you for the gift. |
| deer | noun | 1 | 1 | a forest animal with antlers | A deer ran across the road. |
| pair | noun | 1 | 2 | two things that go together | I bought a pair of socks. |
| pear | noun | 1 | 2 | a sweet fruit shaped like a bell | I ate a ripe pear. |
| blue | adjective | 1 | 1 | the color of the sky | The ocean was deep blue. |
| blew | verb | 1 | 2 | moved air out in the past | The wind blew my hat off. |
| meet | verb | 1 | 1 | to come together with someone | We meet at the park. |
| meat | noun | 1 | 2 | food that comes from animals | We grilled meat on Sunday. |
| week | noun | 1 | 1 | seven days | There are seven days in a week. |
| weak | adjective | 1 | 2 | not strong | The old branch was weak. |
| wait | verb | 1 | 1 | to stay until something happens | Please wait for me. |
| weight | noun | 1 | 3 | how heavy something is | The weight of the box surprised me. |
| cent | noun | 1 | 3 | one penny | A cent is a small coin. |
| sent | verb | 1 | 2 | caused something to go in the past | I sent a card to my aunt. |
| scent | noun | 1 | 3 | a smell | The scent of cookies filled the kitchen. |
| board | noun | 1 | 2 | a flat piece of wood | I wrote on the board. |
| bored | adjective | 1 | 3 | tired of having nothing to do | I was bored on the rainy day. |

### g3u9: Contractions

- TEKS: 3.2B.iii; CCSS: L.3.2.d, L.3.2.f
- Typical time of year: Jan
- Tier: core; 20 words
- Rule for kids: A contraction joins two words and uses an apostrophe in place of the missing letters. Say the long form to find where the apostrophe goes.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| aren't | verb | 1 | 2 | short for are not | We aren't late. |
| couldn't | verb | 2 | 3 | short for could not | I couldn't find my shoe. |
| doesn't | verb | 2 | 2 | short for does not | She doesn't like spiders. |
| hadn't | verb | 2 | 3 | short for had not | He hadn't finished his lunch. |
| hasn't | verb | 2 | 3 | short for has not | It hasn't rained in weeks. |
| haven't | verb | 2 | 3 | short for have not | I haven't seen that movie. |
| he's | pronoun | 1 | 2 | short for he is | He's my brother. |
| here's | pronoun | 1 | 2 | short for here is | Here's your lunch. |
| I'd | pronoun | 1 | 2 | short for I would | I'd like some juice. |
| shouldn't | verb | 2 | 3 | short for should not | You shouldn't run inside. |
| there's | pronoun | 1 | 2 | short for there is | There's a rainbow in the sky. |
| we'll | pronoun | 1 | 2 | short for we will | We'll see you tomorrow. |
| we've | pronoun | 1 | 2 | short for we have | We've finished our project. |
| weren't | verb | 1 | 3 | short for were not | We weren't home yesterday. |
| who's | pronoun | 1 | 3 | short for who is | Who's ready for recess? |
| wouldn't | verb | 2 | 3 | short for would not | He wouldn't share his toys. |
| they'll | pronoun | 1 | 3 | short for they will | They'll arrive at noon. |
| you'll | pronoun | 1 | 2 | short for you will | You'll love the zoo. |
| what's | pronoun | 1 | 2 | short for what is | What's your favorite book? |
| where's | pronoun | 1 | 3 | short for where is | Where's my backpack? |

### g3u10: Compound words

- TEKS: 3.2B.iii; CCSS: RF.3.3.a, L.3.2.f
- Typical time of year: Jan-Feb
- Tier: core; 18 words
- Rule for kids: Compound words are two words joined together. If you can spell each part, you can spell the whole word.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| anyone | pronoun | 3 | 2 | any person | Does anyone want a snack? |
| backyard | noun | 2 | 1 | the yard behind a house | We play soccer in the backyard. |
| baseball | noun | 2 | 1 | a game played with a bat and ball | We went to a baseball game. |
| bedtime | noun | 2 | 1 | the time you go to sleep | Our bedtime is at eight. |
| fingernail | noun | 3 | 3 | the hard covering on the tip of a finger | I cut my fingernail. |
| grasshopper | noun | 3 | 3 | a jumping green insect | A grasshopper leaped across the path. |
| hallway | noun | 2 | 1 | a long passage inside a building | We walk quietly in the hallway. |
| lunchroom | noun | 2 | 2 | where students eat at school | The lunchroom was noisy. |
| moonlight | noun | 2 | 2 | light from the moon | We walked home by moonlight. |
| nobody | pronoun | 3 | 2 | no person | Nobody was home. |
| overnight | adverb | 3 | 3 | during the whole night | It snowed overnight. |
| raindrop | noun | 2 | 2 | a single drop of rain | A raindrop landed on my nose. |
| rattlesnake | noun | 3 | 3 | a snake with a noisy tail | A rattlesnake shook its tail. |
| skateboard | noun | 2 | 2 | a board with wheels you ride | He rode his skateboard to the park. |
| sunflower | noun | 3 | 2 | a tall yellow flower with seeds | A sunflower turned toward the sun. |
| thunderstorm | noun | 3 | 3 | a storm with thunder and lightning | We stayed inside during the thunderstorm. |
| waterfall | noun | 3 | 2 | water falling over a cliff | We hiked to a tall waterfall. |
| wildlife | noun | 2 | 3 | animals that live in nature | We saw wildlife at the park. |

### g3u11: Syllable division (VCCV, VCV, VCCCV)

- TEKS: 3.2B.v; CCSS: RF.3.3.c, L.3.2.f
- Typical time of year: Feb
- Tier: core; 18 words
- Rule for kids: VCCV: split between the two consonants (den-tist). VCV: try splitting before the consonant (lem-on vs. pi-lot). VCCCV: split after the first or second consonant (hun-dred).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| dentist | noun | 2 | 2 | a doctor for teeth | The dentist counted my teeth. |
| plastic | noun | 2 | 2 | a light, bendable material | The toy was made of plastic. |
| tennis | noun | 2 | 2 | a game played with rackets | We play tennis on Saturdays. |
| carpet | noun | 2 | 2 | a soft covering for a floor | The carpet felt soft. |
| signal | noun | 2 | 2 | a sign that tells something | The signal turned green. |
| hammer | noun | 2 | 2 | a tool for pounding nails | Dad used a hammer to fix the fence. |
| sister | noun | 2 | 1 | a girl who has the same parents as you | My sister reads to me. |
| ribbon | noun | 2 | 2 | a long thin strip of cloth | She tied a red ribbon on the gift. |
| mirror | noun | 2 | 3 | glass that shows your reflection | I looked in the mirror. |
| lemon | noun | 2 | 2 | a sour yellow fruit | I squeezed a lemon into the water. |
| river | noun | 2 | 2 | a long stream of water | The river flows to the sea. |
| model | noun | 2 | 2 | a small copy of something | He built a model airplane. |
| planet | noun | 2 | 2 | a large object that circles a star | Mars is a red planet. |
| seven | noun | 2 | 1 | the number after six | I am seven years old. |
| visit | verb | 2 | 2 | to go see someone | We visit our cousins at the lake. |
| hundred | noun | 2 | 3 | ten tens | There are a hundred pennies in a dollar. |
| children | plural noun | 2 | 2 | young people | The children played in the park. |
| sample | noun | 2 | 3 | a small piece to try | We tasted a sample of cheese. |

### g3u12: Prefixes (pre-, mis-, non-, sub-, un-, re-)

- TEKS: 3.2B.vi; CCSS: L.3.2.e, L.3.4.b
- Typical time of year: Feb-Mar
- Tier: core; 18 words
- Rule for kids: A prefix is added to the front of a word and changes its meaning. pre- means before, mis- means wrong, non- means not, sub- means under. Do not change the spelling of the base word.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| preheat | verb | 2 | 2 | to warm before using | Preheat the oven before baking. |
| preschool | noun | 2 | 2 | school before kindergarten | My little sister goes to preschool. |
| preview | noun | 2 | 2 | a first look at something | We saw a preview of the movie. |
| misspell | verb | 2 | 3 | to spell wrong | Try not to misspell your name. |
| misplace | verb | 2 | 3 | to put in the wrong place | I might misplace my keys. |
| misread | verb | 2 | 3 | to read wrong | I misread the sign. |
| nonstop | adjective | 2 | 2 | without stopping | We took a nonstop flight to Dallas. |
| nonfiction | noun | 3 | 3 | books about real things | I read a nonfiction book about sharks. |
| nonsense | noun | 2 | 3 | words that do not make sense | The poem was full of nonsense. |
| subway | noun | 2 | 2 | a train that runs underground | We rode the subway in the city. |
| unwrap | verb | 2 | 2 | to take off the wrapping | I will unwrap the present. |
| unpack | verb | 2 | 2 | to take things out of a bag | We unpack after our trip. |
| untie | verb | 2 | 2 | to loosen a knot | Can you untie my shoelace? |
| unclear | adjective | 2 | 3 | not easy to understand | The directions were unclear. |
| uneven | adjective | 3 | 3 | not flat or smooth | The path was uneven. |
| return | verb | 2 | 2 | to go or give back | Please return the book to the library. |
| review | verb | 2 | 2 | to look over again | Let's review our spelling words. |
| refill | verb | 2 | 2 | to fill again | Please refill my water bottle. |

### g3u13: Suffixes (-ful, -less, -ly, -ment, -ness)

- TEKS: 3.2B.vii; CCSS: L.3.2.e, L.3.4.b
- Typical time of year: Mar
- Tier: core; 19 words
- Rule for kids: A suffix goes at the end. -ful means full of, -less means without, -ly tells how, -ment and -ness make nouns. Add the suffix to the whole base word.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| careful | adjective | 2 | 2 | using care | Be careful with the glass. |
| helpful | adjective | 2 | 2 | giving aid | The helpful girl carried my bag. |
| joyful | adjective | 2 | 2 | full of happiness | The joyful crowd cheered. |
| painful | adjective | 2 | 2 | causing hurt | The splinter was painful. |
| thankful | adjective | 2 | 2 | feeling grateful | I am thankful for my family. |
| colorful | adjective | 3 | 2 | having many colors | The parrot was colorful. |
| careless | adjective | 2 | 3 | not using care | A careless mistake cost a point. |
| helpless | adjective | 2 | 3 | not able to help oneself | The baby bird was helpless. |
| endless | adjective | 2 | 2 | never ending | The desert looked endless. |
| fearless | adjective | 2 | 3 | without fear | The fearless climber went up the cliff. |
| sadly | adverb | 2 | 2 | in a sad way | She sadly waved goodbye. |
| slowly | adverb | 2 | 1 | not fast | The turtle moved slowly. |
| quickly | adverb | 2 | 2 | fast | He quickly tied his shoes. |
| loudly | adverb | 2 | 2 | with much noise | The band played loudly. |
| kindness | noun | 2 | 2 | being nice to others | Kindness makes friends. |
| sadness | noun | 2 | 2 | the feeling of being sad | I felt sadness when summer ended. |
| darkness | noun | 2 | 2 | having no light | We turned on a flashlight in the darkness. |
| movement | noun | 2 | 3 | a change of position | I saw a small movement in the grass. |
| payment | noun | 2 | 3 | money given for something | The store took our payment. |

### g3u14: Suffixes that change the base word (drop e, change y to i, double the consonant)

- TEKS: 3.2B.vii; CCSS: L.3.2.e, L.3.2.f
- Typical time of year: Apr-May
- Tier: core; 18 words
- Rule for kids: Sometimes the base word changes when you add a suffix. Drop the silent e before -ing or -ed (dance, dancer). Change y to i before most endings (happy, happily). Double the last letter after one short vowel (swim, swimming).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| happily | adverb | 3 | 3 | in a glad way | They played happily all day. |
| happiness | noun | 3 | 3 | the feeling of being glad | Her face glowed with happiness. |
| easily | adverb | 3 | 3 | without trouble | He easily solved the puzzle. |
| heavily | adverb | 3 | 3 | in a strong or thick way | It rained heavily all night. |
| silliness | noun | 3 | 3 | acting funny or goofy | There was silliness at the party. |
| laziness | noun | 3 | 3 | not wanting to work | His laziness made him miss the bus. |
| shining | verb | 2 | 2 | giving off light | The sun was shining. |
| baker | noun | 2 | 2 | a person who bakes bread | The baker made fresh rolls. |
| dancer | noun | 2 | 2 | a person who dances | The dancer spun on one foot. |
| excited | adjective | 3 | 2 | very happy about something | I am excited about the field trip. |
| swimming | verb | 2 | 3 | moving through water | We are swimming in the lake. |
| sitting | verb | 2 | 2 | resting on a seat | The cat is sitting on the windowsill. |
| shopping | verb | 2 | 3 | looking for things to buy | We went shopping for shoes. |
| drummer | noun | 2 | 3 | a person who plays drums | The drummer kept the beat. |
| cities | plural noun | 2 | 3 | more than one city | Dallas and Austin are cities in Texas. |
| stories | plural noun | 2 | 3 | more than one tale | We read stories at bedtime. |
| parties | plural noun | 2 | 3 | more than one party | We went to two parties. |
| copied | verb | 2 | 3 | made the same as another | She copied the poem neatly. |

### g3hf: High-frequency and sight words

- TEKS: 3.2B (high-frequency review); CCSS: RF.3.3.d, L.3.2.f
- Typical time of year: all year
- Tier: hf; 31 words
- Rule for kids: These words are used all the time in reading and writing. Some do not follow the rules, so memorize the tricky parts.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| about | preposition | 2 | 1 | on the subject of | The book is about space. |
| better | adjective | 2 | 2 | more good | I feel better today. |
| bring | verb | 1 | 1 | to carry with you | Please bring a pencil. |
| carry | verb | 2 | 2 | to hold and move | Can you carry this box? |
| clean | adjective | 1 | 1 | not dirty | The kitchen is clean. |
| done | adjective | 1 | 2 | finished | I am done with my work. |
| draw | verb | 1 | 1 | to make a picture with a pencil | I like to draw animals. |
| drink | verb | 1 | 1 | to take in liquid | Drink plenty of water. |
| hold | verb | 1 | 1 | to keep in your hands | Hold my hand when we cross. |
| kind | adjective | 1 | 1 | friendly and caring | She is kind to everyone. |
| light | noun | 1 | 2 | brightness that helps you see | Turn on the light. |
| myself | pronoun | 2 | 2 | me and no one else | I tied my shoes myself. |
| only | adverb | 2 | 2 | just one | I have only one pencil. |
| own | adjective | 1 | 2 | belonging to me | I have my own room. |
| show | verb | 1 | 1 | to let someone see | Show me your picture. |
| small | adjective | 1 | 1 | little in size | A small bird sat on the fence. |
| start | verb | 1 | 1 | to begin | We start school at eight. |
| today | noun | 2 | 2 | this day | Today is Friday. |
| which | pronoun | 1 | 2 | what one | Which book do you want? |
| wash | verb | 1 | 2 | to clean with water | Wash your hands. |
| until | preposition | 2 | 2 | up to the time of | Wait until the bell rings. |
| answer | noun | 2 | 3 | a reply to a question | I know the answer. |
| believe | verb | 2 | 3 | to think something is true | I believe in you. |
| caught | verb | 1 | 3 | grabbed something moving | He caught the ball. |
| different | adjective | 3 | 3 | not the same | Her coat is different from mine. |
| early | adverb | 2 | 3 | before the usual time | We got up early. |
| heard | verb | 1 | 3 | noticed with your ears in the past | I heard a bird sing. |
| special | adjective | 2 | 3 | not ordinary | Today is a special day. |
| straight | adjective | 1 | 3 | without a bend | Draw a straight line. |
| trouble | noun | 2 | 3 | a difficulty | I had trouble with the lock. |
| country | noun | 2 | 3 | a land with its own government | Texas is in the United States, a big country. |

### g3bee: Bee challenge words

- TEKS: 3.2B.i, 3.2B.iv; CCSS: L.3.2.f
- Typical time of year: all year
- Tier: bee; 22 words
- Rule for kids: Longer words for a spelling bee. Think about syllables, silent letters and tricky vowels.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| celebrate | verb | 3 | 3 | to have fun on a special day | We celebrate my birthday in May. |
| community | noun | 4 | 3 | a group of people who live together | Our community has a nice park. |
| creature | noun | 2 | 3 | any living animal | A tiny creature hid in the grass. |
| decorate | verb | 3 | 3 | to make look nice | We decorate the tree for the holiday. |
| dictionary | noun | 4 | 3 | a book that tells what words mean | I looked up the word in the dictionary. |
| fabulous | adjective | 3 | 3 | amazing | The magic show was fabulous. |
| gigantic | adjective | 3 | 3 | extremely large | A gigantic wave rolled in. |
| harvest | noun | 2 | 3 | the gathering of crops | The farmers celebrate the harvest. |
| invisible | adjective | 4 | 3 | not able to be seen | The ghost in the story was invisible. |
| jealous | adjective | 2 | 3 | wanting what someone else has | I felt jealous of his new bike. |
| knowledge | noun | 2 | 3 | what you know | Books give us knowledge. |
| language | noun | 2 | 3 | words people use to talk | She speaks a second language. |
| measure | verb | 2 | 3 | to find the size of something | Measure the table with a ruler. |
| ocean | noun | 2 | 2 | a very large body of salty water | We swam in the ocean. |
| pioneer | noun | 3 | 3 | a person who explores new places | The pioneer crossed the plains. |
| rhythm | noun | 2 | 3 | a pattern of beats | The drum keeps a steady rhythm. |
| scissors | plural noun | 2 | 3 | a tool with two blades for cutting | I cut the paper with scissors. |
| thousand | noun | 2 | 3 | ten hundreds | A thousand stars shone above us. |
| vegetable | noun | 3 | 3 | a plant food like a carrot | I ate every vegetable on my plate. |
| neighbor | noun | 2 | 3 | a person who lives near you | Our neighbor waved hello. |
| orchestra | noun | 3 | 3 | a large group of musicians | The orchestra played at the concert. |
| calendar | noun | 3 | 3 | a chart showing days and months | I marked the day on the calendar. |

## Grade 4

Focus: Multisyllabic words with multiple sound-spelling patterns, homophones, advanced syllable division, prefixes, suffixes with base-word changes, and an introduction to Greek and Latin roots.

### g4u1: Vowel teams and diphthongs in multisyllabic words

- TEKS: 4.2B.i, 4.2B.iii; CCSS: RF.4.3.a, L.4.2.d
- Typical time of year: Aug-Sep
- Tier: core; 16 words
- Rule for kids: Longer words often hide vowel teams like oa, ea, oi, ou, ew. Keep each team together inside its syllable.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| oatmeal | noun | 2 | 1 | a hot cereal made from oats | I had oatmeal with raisins for breakfast. |
| keyboard | noun | 2 | 2 | the keys you type on | She typed her story on the keyboard. |
| steamboat | noun | 2 | 2 | an old boat powered by steam | The steamboat chugged down the river. |
| boundary | noun | 3 | 3 | a line that marks an edge | A fence marks the boundary of the farm. |
| loudspeaker | noun | 3 | 2 | a device that makes sound louder | The principal talked over the loudspeaker. |
| snowstorm | noun | 2 | 2 | a storm with heavy snow | School closed because of the snowstorm. |
| rainforest | noun | 3 | 2 | a thick forest with lots of rain | Monkeys live in the rainforest. |
| goalkeeper | noun | 3 | 2 | the player who guards the goal | The goalkeeper blocked the shot. |
| coastline | noun | 2 | 2 | the edge of land by the sea | We drove along the coastline. |
| moisture | noun | 2 | 3 | slight wetness | Plants need moisture to grow. |
| annoying | adjective | 3 | 3 | bothering or irritating | The buzzing mosquito was annoying. |
| employ | verb | 2 | 3 | to give someone a job | The bakery will employ two helpers. |
| voyage | noun | 2 | 3 | a long trip by sea | The ship began its voyage. |
| jewel | noun | 2 | 3 | a valuable shiny stone | The crown held a red jewel. |
| powder | noun | 2 | 2 | very fine dust | She sprinkled powder on the cake. |
| crowded | adjective | 2 | 2 | too full of people | The bus was crowded after school. |

### g4u2: Unusual spellings (ough, augh, eigh, ph, ch as /k/)

- TEKS: 4.2B.iii; CCSS: RF.4.3.a, L.4.2.d
- Typical time of year: Sep-Oct
- Tier: core; 16 words
- Rule for kids: Some sounds have odd spellings. ough and augh can say /aw/ or /o/, eigh says long a, ph says /f/, and ch can say /k/. Learn these words by sight.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| though | conjunction | 1 | 3 | even if | I went outside though it was cold. |
| bought | verb | 1 | 3 | paid for something in the past | We bought apples at the market. |
| fought | verb | 1 | 3 | struggled against someone in the past | The knights fought bravely in the story. |
| daughter | noun | 2 | 3 | a girl who is someone's child | Her daughter plays the violin. |
| eighty | noun | 2 | 3 | the number after seventy-nine | My grandpa is eighty years old. |
| sleigh | noun | 1 | 3 | a sled pulled by animals | The sleigh glided over the snow. |
| alphabet | noun | 3 | 2 | all the letters of a language | I can say the alphabet backward. |
| phone | noun | 1 | 1 | a device for talking to someone far away | I called Grandma on the phone. |
| dolphin | noun | 2 | 2 | a smart sea animal that jumps | A dolphin leaped out of the water. |
| trophy | noun | 2 | 2 | a prize cup | The team won a golden trophy. |
| stomach | noun | 2 | 3 | the organ where food goes | My stomach growled before lunch. |
| chorus | noun | 2 | 3 | a group that sings together | The chorus sang at the concert. |
| echo | noun | 2 | 2 | a sound that bounces back | I heard an echo in the canyon. |
| anchor | noun | 2 | 3 | a heavy hook that holds a ship | The sailors dropped the anchor. |
| character | noun | 3 | 3 | a person in a story | My favorite character is the brave mouse. |
| laughter | noun | 2 | 3 | the sound of laughing | Laughter filled the room. |

### g4u3: Final syllables -tion, -sion, -ture

- TEKS: 4.2B.i, 4.2B.iii; CCSS: RF.4.3.a, L.4.2.d
- Typical time of year: Oct
- Tier: core; 16 words
- Rule for kids: Endings like -tion and -sion say /shun/ and -ture says /cher/. They are always the last syllable and are never stressed.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| action | noun | 2 | 2 | doing something | The movie was full of action. |
| station | noun | 2 | 2 | a place where trains or buses stop | We waited at the train station. |
| section | noun | 2 | 2 | a part of something | I found it in the fiction section. |
| question | noun | 2 | 2 | something you ask | Raise your hand if you have a question. |
| fraction | noun | 2 | 3 | a part of a whole number | One half is a fraction. |
| collection | noun | 3 | 3 | a group of things gathered together | He has a collection of stamps. |
| invention | noun | 3 | 3 | a new thing someone creates | The light bulb was a great invention. |
| decision | noun | 3 | 3 | a choice you make | It was a hard decision. |
| television | noun | 4 | 3 | a screen that shows programs | We watched a nature show on television. |
| explosion | noun | 3 | 3 | a sudden loud burst | We heard an explosion of fireworks. |
| picture | noun | 2 | 2 | a drawing or photo | She drew a picture of her dog. |
| nature | noun | 2 | 2 | everything in the outdoors | I love walking in nature. |
| future | noun | 2 | 2 | time that has not happened yet | I want to be a doctor in the future. |
| capture | verb | 2 | 3 | to catch or record | Cameras capture moments in time. |
| texture | noun | 2 | 3 | how something feels | The sand has a rough texture. |
| furniture | noun | 3 | 3 | tables, chairs and beds | We moved the furniture to clean. |

### g4u4: Homophones and commonly confused words

- TEKS: 4.2B.ii; CCSS: L.4.1.g, L.4.2.d
- Typical time of year: Nov
- Tier: core; 19 words
- Rule for kids: Homophones sound the same but mean different things. Read the whole sentence to decide which spelling fits.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| brake | noun | 1 | 2 | the part that stops a bike or car | I pressed the brake to stop. |
| break | verb | 1 | 2 | to snap or split apart | Be careful not to break the glass. |
| course | noun | 1 | 3 | a path or class of study | The runners ran the full course. |
| coarse | adjective | 1 | 3 | rough, not smooth | The rope felt coarse in my hands. |
| hour | noun | 1 | 3 | sixty minutes | The movie lasts one hour. |
| our | pronoun | 1 | 2 | belonging to us | This is our house. |
| peace | noun | 1 | 2 | calm and quiet | The forest was full of peace. |
| piece | noun | 1 | 2 | a part of something | I ate a piece of pie. |
| principal | noun | 3 | 3 | the head of a school | The principal visited our class. |
| principle | noun | 3 | 3 | a basic rule or idea | Honesty is an important principle. |
| role | noun | 1 | 2 | a part in a play | She plays the lead role. |
| roll | verb | 1 | 1 | to turn over and over | The ball will roll down the hill. |
| threw | verb | 1 | 2 | tossed in the past | He threw the ball to me. |
| whether | conjunction | 2 | 3 | if | I wonder whether it will rain. |
| weather | noun | 2 | 2 | the sun, rain and wind outside | The weather is warm today. |
| aloud | adverb | 2 | 3 | in a voice others can hear | I read the poem aloud. |
| allowed | verb | 2 | 3 | let someone do something | We are allowed to play outside. |
| desert | noun | 2 | 2 | a hot, dry land | Cacti grow in the desert. |
| dessert | noun | 2 | 3 | a sweet treat after dinner | We had cake for dessert. |

### g4u5: Advanced syllable division (V/V, VCV, VCCCV)

- TEKS: 4.2B.iv; CCSS: RF.4.3.a, L.4.2.d
- Typical time of year: Nov-Dec
- Tier: core; 17 words
- Rule for kids: When two vowel sounds sit side by side, split between them: qui-et, ra-di-o. For three consonants in a row, split after the first or second: con-struct.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| quiet | adjective | 2 | 2 | making little or no noise | The library is quiet. |
| science | noun | 2 | 2 | learning about the world by testing ideas | We did a science experiment. |
| create | verb | 2 | 2 | to make something new | I will create a poster for the fair. |
| idea | noun | 3 | 2 | a thought or plan | She had a great idea. |
| poem | noun | 2 | 2 | a piece of writing with rhythm | I wrote a poem about spring. |
| diet | noun | 2 | 3 | the food a person or animal eats | A healthy diet includes fruit. |
| violin | noun | 3 | 3 | a string instrument played with a bow | My sister plays the violin. |
| radio | noun | 3 | 2 | a device that plays music from the air | We listened to the radio in the car. |
| video | noun | 3 | 2 | moving pictures recorded on a device | We watched a video about volcanoes. |
| museum | noun | 3 | 2 | a building that shows old or special things | We visited the art museum. |
| cooperate | verb | 4 | 3 | to work together | We cooperate to finish the project. |
| area | noun | 3 | 2 | a space or region | The play area was full of kids. |
| period | noun | 3 | 2 | a length of time or a punctuation dot | The class period lasted an hour. |
| construct | verb | 2 | 3 | to build | They construct a bridge. |
| instrument | noun | 3 | 3 | a tool or something you play music with | The drum is my favorite instrument. |
| complain | verb | 2 | 3 | to say you are unhappy about something | It is better not to complain. |
| explore | verb | 2 | 2 | to look around a new place | Let's explore the cave. |

### g4u6: Prefixes (inter-, over-, under-, super-, trans-, mid-, fore-)

- TEKS: 4.2B.v; CCSS: L.4.4.b
- Typical time of year: Dec-Jan
- Tier: core; 16 words
- Rule for kids: These prefixes change the meaning: inter- means between, over- means too much or above, under- means below, super- means above or great, trans- means across, mid- means middle.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| interact | verb | 3 | 3 | to act together with others | We interact with friends at recess. |
| internet | noun | 3 | 2 | a worldwide network of computers | I looked it up on the internet. |
| interrupt | verb | 3 | 3 | to break into a conversation | It is rude to interrupt someone talking. |
| overcome | verb | 3 | 3 | to get past a problem | She worked hard to overcome her fear. |
| overflow | verb | 3 | 3 | to spill over the edge | Do not let the tub overflow. |
| overlook | verb | 3 | 3 | to miss something | Do not overlook the last problem. |
| underground | adverb | 3 | 2 | beneath the earth | Moles dig tunnels underground. |
| underline | verb | 3 | 2 | to draw a line beneath | Underline the answer in your book. |
| understand | verb | 3 | 2 | to get the meaning of | I understand the directions. |
| supermarket | noun | 3 | 2 | a big store that sells food | We bought milk at the supermarket. |
| superhero | noun | 4 | 2 | a hero with special powers | The superhero saved the day in the comic. |
| transport | verb | 2 | 3 | to carry from one place to another | Trucks transport food to stores. |
| transform | verb | 2 | 3 | to change completely | A caterpillar will transform into a butterfly. |
| midnight | noun | 2 | 2 | twelve o'clock at night | The clock struck midnight. |
| midway | adverb | 2 | 3 | halfway | We stopped midway up the hill. |
| forecast | noun | 2 | 3 | a prediction about weather | The forecast says it will be sunny. |

### g4u7: Suffixes (-able, -ible, -ous, -ious)

- TEKS: 4.2B.vi; CCSS: L.4.4.b
- Typical time of year: Jan-Feb
- Tier: core; 17 words
- Rule for kids: -able and -ible mean can be done. -ous means full of. If the base is a whole word, you usually use -able. If not, you often need -ible.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| comfortable | adjective | 4 | 3 | feeling relaxed and cozy | The couch was comfortable. |
| enjoyable | adjective | 4 | 3 | giving pleasure | The trip was enjoyable. |
| reasonable | adjective | 4 | 3 | fair and sensible | It is a reasonable price. |
| valuable | adjective | 4 | 3 | worth a lot | The old coin was valuable. |
| visible | adjective | 3 | 3 | able to be seen | The stars are visible tonight. |
| possible | adjective | 3 | 2 | able to happen | It is possible to learn anything. |
| terrible | adjective | 3 | 2 | very bad | The storm was terrible. |
| flexible | adjective | 3 | 3 | able to bend easily | A gymnast is flexible. |
| famous | adjective | 2 | 2 | known by many people | The singer is famous. |
| nervous | adjective | 2 | 3 | worried or jumpy | I felt nervous before my speech. |
| curious | adjective | 3 | 3 | wanting to know more | The curious puppy sniffed everything. |
| delicious | adjective | 3 | 3 | tasting very good | The soup was delicious. |
| mysterious | adjective | 4 | 3 | hard to explain | A mysterious box sat on the porch. |
| serious | adjective | 3 | 2 | not joking | He had a serious look. |
| adventurous | adjective | 4 | 3 | willing to try new things | The adventurous kids climbed the hill. |
| various | adjective | 3 | 3 | many different kinds | We saw various birds at the lake. |
| generous | adjective | 3 | 3 | happy to share | The generous woman gave food to neighbors. |

### g4u8: Base-word changes (drop e, double the consonant, y to i)

- TEKS: 4.2B.vi; CCSS: L.4.2.d
- Typical time of year: Feb-Mar
- Tier: core; 18 words
- Rule for kids: When you add a suffix, check the base word. Drop e before -ing, -ed, -able. Double the last consonant if the word ends with one vowel and one consonant in a stressed syllable. Change y to i before most endings.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| beginning | noun | 3 | 3 | the start | The beginning of the story was exciting. |
| forgetting | verb | 3 | 3 | not remembering | I keep forgetting my umbrella. |
| preferred | verb | 2 | 3 | liked better | She preferred the blue shirt. |
| admitted | verb | 3 | 3 | let in or confessed | They admitted that they were wrong. |
| controlled | verb | 2 | 3 | had power over | He controlled the robot. |
| planning | verb | 2 | 2 | making a plan | We are planning a trip. |
| trapped | verb | 1 | 3 | caught so it cannot get away | The bug was trapped in the jar. |
| noticing | verb | 3 | 3 | seeing or paying attention to | I am noticing the leaves change color. |
| creating | verb | 3 | 3 | making something new | She is creating a painting. |
| arranged | verb | 2 | 3 | put in order | We arranged the books on the shelf. |
| easier | adjective | 3 | 2 | less hard | Reading gets easier with practice. |
| earliest | adjective | 3 | 3 | first of all | The earliest bus leaves at six. |
| hungrily | adverb | 3 | 3 | in a way that shows you want food | The puppy ate hungrily. |
| luckily | adverb | 3 | 3 | by good fortune | Luckily the rain stopped. |
| replied | verb | 2 | 3 | answered | She replied to the letter. |
| denied | verb | 2 | 3 | said no to | The coach denied the request. |
| supplies | plural noun | 2 | 3 | things needed for a job | We packed art supplies. |
| enemies | plural noun | 3 | 3 | people or things that work against you | In the story, the heroes beat their enemies. |

### g4u9: Latin roots (spect, port, dict, struct, rupt, aud, vis)

- TEKS: 4.2B.iv, 4.2B.v; CCSS: L.4.4.b
- Typical time of year: Mar-Apr
- Tier: core; 18 words
- Rule for kids: Many English words come from Latin roots. spect means look, port means carry, dict means say, struct means build, rupt means break, aud means hear, vis means see.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| inspect | verb | 2 | 3 | to look at closely | Please inspect the apples for bruises. |
| respect | noun | 2 | 2 | care for others | Show respect to your teacher. |
| spectator | noun | 3 | 3 | a person who watches an event | Each spectator cheered. |
| export | verb | 2 | 3 | to send goods to another country | Texas will export many goods. |
| import | verb | 2 | 3 | to bring goods from another country | The store will import bananas. |
| portable | adjective | 3 | 3 | able to be carried | A portable speaker is easy to carry. |
| reporter | noun | 3 | 2 | a person who tells the news | The reporter interviewed the mayor. |
| dictate | verb | 2 | 3 | to say out loud for someone to write | The teacher will dictate the sentence. |
| predict | verb | 2 | 2 | to say what will happen | I predict it will rain. |
| structure | noun | 2 | 3 | something built | The tall structure was a lighthouse. |
| instruct | verb | 2 | 3 | to teach or direct | Coaches instruct players. |
| erupt | verb | 2 | 3 | to burst out | The volcano will erupt. |
| disrupt | verb | 2 | 3 | to interrupt or break up | A loud noise can disrupt the class. |
| audience | noun | 3 | 3 | people watching a show | The audience clapped. |
| audio | noun | 3 | 3 | sound that is recorded | I listened to the audio book. |
| auditorium | noun | 4 | 3 | a large room for shows | We met in the school auditorium. |
| vision | noun | 2 | 3 | the ability to see | Her vision is very good. |
| revise | verb | 2 | 3 | to change and improve | Please revise your essay. |

### g4u10: Greek roots (tele, photo, graph, bio, geo, therm, micro, auto)

- TEKS: 4.2B.iv; CCSS: L.4.4.b
- Typical time of year: Apr-May
- Tier: core; 16 words
- Rule for kids: Some words are built from Greek parts. tele means far, photo means light, graph means write, bio means life, geo means earth, therm means heat, micro means tiny, auto means self.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| telephone | noun | 3 | 2 | a device to talk with far-off people | I answered the telephone. |
| telescope | noun | 3 | 2 | a tool for seeing faraway objects | We looked at Saturn with a telescope. |
| photograph | noun | 3 | 2 | a picture taken with a camera | I put the photograph in a frame. |
| autograph | noun | 3 | 3 | a person's signature | He asked for an autograph. |
| paragraph | noun | 3 | 2 | a group of sentences about one idea | Write one paragraph about your pet. |
| biography | noun | 4 | 3 | the story of someone's life | I read a biography of Abraham Lincoln. |
| biology | noun | 4 | 3 | the study of living things | Biology explains how plants grow. |
| geography | noun | 4 | 3 | the study of places on earth | We learned about rivers in geography. |
| thermometer | noun | 4 | 3 | a tool for measuring temperature | The thermometer read ninety degrees. |
| microscope | noun | 3 | 3 | a tool that makes tiny things look big | We saw cells under the microscope. |
| automatic | adjective | 4 | 3 | working by itself | The door is automatic. |
| automobile | noun | 4 | 3 | a car | The old automobile still runs. |
| symphony | noun | 3 | 3 | a long piece of music for an orchestra | The symphony lasted an hour. |
| microphone | noun | 3 | 3 | a device that makes your voice louder | She sang into the microphone. |
| barometer | noun | 4 | 3 | a tool for measuring air pressure | A barometer helps predict the weather. |
| kilometer | noun | 4 | 3 | a unit of distance | The race was one kilometer long. |

### g4hf: High-frequency and tricky words

- TEKS: 4.2B.i, 4.2B.iii; CCSS: L.4.2.d
- Typical time of year: all year
- Tier: hf; 32 words
- Rule for kids: These words are common but easy to misspell. Look for the part that surprises you, like the silent letters in listen and island.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| against | preposition | 2 | 3 | touching or opposed to | He leaned against the wall. |
| along | preposition | 2 | 2 | moving on or beside | We walked along the shore. |
| although | conjunction | 3 | 3 | even though | Although it was late, we kept playing. |
| among | preposition | 2 | 2 | surrounded by | The cat hid among the flowers. |
| between | preposition | 2 | 2 | in the space separating two things | Sit between me and Mia. |
| build | verb | 1 | 3 | to make by putting parts together | We build forts in the living room. |
| built | verb | 1 | 3 | made by putting parts together in the past | They built a snowman. |
| certain | adjective | 2 | 3 | sure | I am certain I locked the door. |
| choose | verb | 1 | 2 | to pick | Choose your favorite book. |
| decide | verb | 2 | 2 | to make up your mind | I cannot decide what to wear. |
| during | preposition | 2 | 2 | throughout a time | Stay quiet during the movie. |
| either | conjunction | 2 | 3 | one or the other | You can have either apple or orange. |
| exercise | noun | 3 | 3 | activity that keeps you strong | Exercise is good for your body. |
| finally | adverb | 3 | 2 | at last | We finally reached the top. |
| forward | adverb | 2 | 2 | toward the front | Step forward and take a bow. |
| guess | verb | 1 | 3 | to give an answer without being sure | Can you guess my number? |
| instead | adverb | 2 | 3 | in place of | I chose pears instead of grapes. |
| island | noun | 2 | 3 | land surrounded by water | We sailed to a small island. |
| listen | verb | 2 | 3 | to pay attention to sounds | Listen to the teacher. |
| minute | noun | 2 | 2 | sixty seconds | Wait a minute. |
| nearly | adverb | 2 | 2 | almost | We nearly missed the bus. |
| often | adverb | 2 | 3 | many times | We often visit the library. |
| probably | adverb | 3 | 3 | most likely | It will probably rain. |
| quite | adverb | 1 | 3 | very | It was quite cold. |
| really | adverb | 3 | 2 | truly | I really like soccer. |
| receive | verb | 2 | 3 | to get something | I hope to receive a letter. |
| separate | adjective | 3 | 3 | apart from others | Please keep the books in separate piles. |
| surely | adverb | 2 | 3 | without doubt | Surely you can finish it. |
| themselves | pronoun | 2 | 3 | those same people | The kids made lunch themselves. |
| toward | preposition | 2 | 2 | in the direction of | He ran toward the gate. |
| usually | adverb | 4 | 2 | most of the time | I usually walk to school. |
| weird | adjective | 1 | 3 | strange | It was a weird sound. |

### g4bee: Bee challenge words

- TEKS: 4.2B.iii, 4.2B.iv; CCSS: L.4.2.d
- Typical time of year: all year
- Tier: bee; 20 words
- Rule for kids: These words are tough. Break them into syllables and watch for silent letters and double consonants.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| accomplish | verb | 3 | 3 | to finish or achieve | We will accomplish our goal. |
| ancient | adjective | 2 | 3 | very, very old | The ancient ruins were beautiful. |
| athlete | noun | 2 | 3 | a person who plays sports | The athlete trained every day. |
| courageous | adjective | 3 | 3 | brave | The courageous firefighter helped the family. |
| exhausted | adjective | 3 | 3 | very tired | I was exhausted after the long hike. |
| fascinate | verb | 3 | 3 | to hold someone's interest | Dinosaurs fascinate me. |
| genuine | adjective | 3 | 3 | real and true | She gave a genuine smile. |
| handkerchief | noun | 3 | 3 | a small cloth for the nose | He used a handkerchief to wipe his nose. |
| laboratory | noun | 4 | 3 | a room for scientific experiments | The scientist worked in the laboratory. |
| necessary | adjective | 4 | 3 | needed | It is necessary to wear a seatbelt. |
| occasion | noun | 3 | 3 | a special event | The birthday party was a happy occasion. |
| opportunity | noun | 5 | 3 | a good chance | This is a great opportunity to learn. |
| rehearse | verb | 2 | 3 | to practice for a show | We will rehearse the play today. |
| souvenir | noun | 3 | 3 | an item that helps you remember a trip | I bought a souvenir at the museum. |
| temperature | noun | 4 | 3 | how hot or cold something is | The temperature dropped at night. |
| unique | adjective | 2 | 3 | one of a kind | Every snowflake is unique. |
| vehicle | noun | 3 | 3 | a machine for carrying people | A truck is a large vehicle. |
| yacht | noun | 1 | 3 | a large private boat | A white yacht sailed past. |
| wilderness | noun | 3 | 3 | wild land with few people | We camped in the wilderness. |
| volunteer | noun | 3 | 3 | a person who helps without pay | The volunteer read to children. |

## Grade 5

Focus: Consonant changes (/t/ to /sh/, /k/ to /sh/), multisyllabic words with multiple patterns, advanced syllable division, prefixes, suffixes with base-word changes, Greek and Latin roots, commonly confused words.

### g5u1: Consonant changes: /t/ to /sh/ and /k/ to /sh/

- TEKS: 5.2B.i; CCSS: L.5.2.e, RF.5.3.a
- Typical time of year: Aug-Sep
- Tier: core; 18 words
- Rule for kids: Some words change their consonant sound when you add an ending: select becomes selection (t to sh), and music becomes musician (k to sh). Spell the base word, then add -tion, -ssion or -cian.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| select | verb | 2 | 2 | to pick out | Select a book from the shelf. |
| selection | noun | 3 | 3 | a choice or group to pick from | The library has a large selection of books. |
| protect | verb | 2 | 2 | to keep safe | A helmet will protect your head. |
| protection | noun | 3 | 3 | something that keeps you safe | Sunscreen gives protection from the sun. |
| subtract | verb | 2 | 2 | to take one number away from another | Subtract five from ten. |
| subtraction | noun | 3 | 3 | taking away numbers | We practiced subtraction in math. |
| educate | verb | 3 | 3 | to teach | Schools educate children. |
| education | noun | 4 | 3 | learning and teaching | Education opens many doors. |
| direct | verb | 2 | 2 | to point the way | The guard will direct the cars. |
| direction | noun | 3 | 2 | the way something points | Which direction is north? |
| pollution | noun | 3 | 3 | harmful stuff in the air or water | Trees help clean air pollution. |
| population | noun | 4 | 3 | the number of people in a place | The city's population is growing. |
| addition | noun | 3 | 2 | adding numbers or something extra | The new puppy is a fun addition to our family. |
| musician | noun | 3 | 2 | a person who plays music | The musician played the guitar. |
| magician | noun | 3 | 3 | a person who does magic tricks | The magician pulled a rabbit from a hat. |
| electrician | noun | 4 | 3 | a person who fixes wiring | The electrician fixed the lights. |
| technician | noun | 3 | 3 | a person with a skilled job | A technician repaired the computer. |
| mathematician | noun | 5 | 3 | a person who studies math | A mathematician solved the puzzle. |

### g5u2: Endings -cial, -tial, -cious, -tious

- TEKS: 5.2B.ii; CCSS: L.5.2.e
- Typical time of year: Sep-Oct
- Tier: core; 16 words
- Rule for kids: The sounds /shul/ and /shus/ have two spellings each. Words like social and special use c, and words like essential and ambitious often use t. Learn each word by sight.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| social | adjective | 2 | 2 | having to do with being with others | Lunch is a social time. |
| official | adjective | 3 | 3 | approved by someone in charge | The referee made an official call. |
| artificial | adjective | 4 | 3 | made by people, not nature | The toy had artificial flowers. |
| crucial | adjective | 2 | 3 | very important | Practice is crucial to improving. |
| essential | adjective | 3 | 3 | absolutely needed | Water is essential for life. |
| potential | noun | 3 | 3 | what someone could become | She has great potential. |
| initial | noun | 3 | 3 | the first letter of a name | Write your initial on the paper. |
| partial | adjective | 2 | 3 | not complete | We saw a partial eclipse. |
| spacious | adjective | 2 | 3 | having lots of room | The new classroom is spacious. |
| precious | adjective | 2 | 3 | very valuable | The locket was precious to her. |
| gracious | adjective | 2 | 3 | kind and polite | She was a gracious host. |
| ambitious | adjective | 3 | 3 | eager to achieve something | He is an ambitious student. |
| nutritious | adjective | 3 | 3 | good for your body | Fruits and vegetables are nutritious. |
| cautious | adjective | 2 | 3 | careful | Be cautious on wet floors. |
| suspicious | adjective | 3 | 3 | feeling something is not right | The detective felt suspicious. |
| vicious | adjective | 2 | 3 | mean and fierce | The vicious storm broke branches. |

### g5u3: Endings -ance, -ence, -ant, -ent

- TEKS: 5.2B.ii; CCSS: L.5.2.e
- Typical time of year: Oct
- Tier: core; 17 words
- Rule for kids: These endings sound almost the same, so you must remember which one the word uses. Look for patterns, but check the dictionary if you are not sure.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| important | adjective | 3 | 2 | having great meaning | It is important to be kind. |
| distance | noun | 2 | 2 | how far apart two things are | The distance to the beach is ten miles. |
| appearance | noun | 3 | 3 | how something looks | His appearance was neat. |
| performance | noun | 3 | 3 | a show for an audience | We loved the school performance. |
| entrance | noun | 2 | 2 | the way in | Meet me at the entrance. |
| balance | noun | 2 | 2 | steadiness or staying upright | She kept her balance on the beam. |
| absence | noun | 2 | 3 | not being present | Her absence was noticed. |
| confidence | noun | 3 | 3 | belief in yourself | He answered with confidence. |
| difference | noun | 3 | 3 | how things are not the same | I see a difference between the twins. |
| patience | noun | 2 | 3 | calmly waiting | Learning to ride a bike takes patience. |
| silence | noun | 2 | 2 | complete quiet | The room fell into silence. |
| evidence | noun | 3 | 3 | facts that show something is true | The footprints were evidence of a visitor. |
| intelligence | noun | 4 | 3 | ability to learn and think | Dolphins show great intelligence. |
| experience | noun | 4 | 3 | something you have lived through | Camping was a great experience. |
| innocent | adjective | 3 | 3 | not guilty | The dog looked innocent. |
| accident | noun | 3 | 2 | something unplanned and bad | It was an accident. |
| president | noun | 3 | 2 | the leader of a country or club | The president gave a speech. |

### g5u4: Prefixes in-, im-, il-, ir-, non-, anti-

- TEKS: 5.2B.iv; CCSS: L.5.4.b
- Typical time of year: Oct-Nov
- Tier: core; 16 words
- Rule for kids: The prefix in- means not, but it changes to im- before b, m, p, il- before l, and ir- before r. Notice the double letter when the base starts with the same letter, like il-legal and ir-regular.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| incorrect | adjective | 3 | 2 | not right | Her answer was incorrect. |
| inactive | adjective | 3 | 2 | not moving or working | The volcano is inactive. |
| indirect | adjective | 3 | 3 | not straight | We took an indirect route. |
| impossible | adjective | 4 | 2 | not able to happen | It seemed impossible, but she did it. |
| impatient | adjective | 3 | 3 | not willing to wait | He grew impatient in line. |
| impolite | adjective | 3 | 3 | not nice or well-mannered | It is impolite to interrupt. |
| imperfect | adjective | 3 | 3 | not without flaws | The vase was beautiful but imperfect. |
| immature | adjective | 3 | 3 | not fully grown | The immature plant was small. |
| illegal | adjective | 3 | 3 | against the law | It is illegal to litter. |
| illogical | adjective | 4 | 3 | not making sense | His story was illogical. |
| irregular | adjective | 4 | 3 | not normal or even | The path had irregular steps. |
| irresponsible | adjective | 5 | 3 | not careful about duties | It is irresponsible to leave a fire burning. |
| antifreeze | noun | 3 | 3 | liquid that stops cars from freezing | Dad added antifreeze to the engine. |
| antibody | noun | 4 | 3 | a protein that fights germs | An antibody helps fight sickness. |
| antisocial | adjective | 4 | 3 | not wanting to be with others | He felt antisocial after the long day. |
| nonliving | adjective | 3 | 3 | not alive | A rock is a nonliving thing. |

### g5u5: Prefixes sub-, trans-, semi-, bi-, tri-, multi-, co-, ex-

- TEKS: 5.2B.iv; CCSS: L.5.4.b
- Typical time of year: Nov-Dec
- Tier: core; 16 words
- Rule for kids: Prefixes tell a number or direction: sub- is under, trans- is across, semi- is half, bi- is two, tri- is three, multi- is many, co- is together, ex- is out.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| submerge | verb | 2 | 3 | to go under water | The submarine will submerge. |
| subtitle | noun | 3 | 2 | words on the bottom of a screen | I read the subtitle in the movie. |
| transparent | adjective | 3 | 3 | able to be seen through | Glass is transparent. |
| translate | verb | 2 | 3 | to change from one language to another | Can you translate this into Spanish? |
| semicircle | noun | 3 | 3 | half of a circle | Draw a semicircle with the compass. |
| semifinal | noun | 4 | 3 | the game before the final | They won the semifinal. |
| biweekly | adjective | 3 | 3 | every two weeks | The newsletter is biweekly. |
| triangle | noun | 3 | 2 | a shape with three sides | A slice of pizza looks like a triangle. |
| tricycle | noun | 3 | 2 | a bike with three wheels | The toddler rode a tricycle. |
| multiply | verb | 3 | 2 | to repeat adding a number many times | Multiply six by seven. |
| multicolored | adjective | 4 | 3 | having many colors | The multicolored kite flew high. |
| coexist | verb | 3 | 3 | to live together peacefully | Cats and dogs can coexist. |
| exclaim | verb | 2 | 3 | to cry out suddenly | The children exclaim with joy. |
| expand | verb | 2 | 2 | to grow larger | A balloon will expand when you blow. |
| extend | verb | 2 | 2 | to stretch out | Extend your arm to reach. |
| extract | verb | 2 | 3 | to pull out | The dentist will extract the tooth. |

### g5u6: Suffixes with base-word changes (-ed, -ing, -able, -ment, -ness)

- TEKS: 5.2B.v; CCSS: L.5.2.e, L.5.4.b
- Typical time of year: Dec-Jan
- Tier: core; 16 words
- Rule for kids: Check the base before you add. Double the last consonant when the stress is on the last syllable (occur, occurred). Change y to i (identify, identified). Keep the silent e after soft c or g (notice, noticeable).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| occurred | verb | 2 | 3 | happened | The accident occurred yesterday. |
| equipped | verb | 2 | 3 | supplied with tools | The lab is equipped with microscopes. |
| regretted | verb | 3 | 3 | felt sorry about | He regretted leaving his coat at home. |
| referred | verb | 2 | 3 | sent to for help | The doctor referred me to a specialist. |
| identified | verb | 4 | 3 | recognized who or what | The bird was identified as a hawk. |
| justified | verb | 3 | 3 | showed to be right | She justified her answer. |
| multiplied | verb | 3 | 3 | increased in number | The bacteria multiplied quickly. |
| simplified | verb | 3 | 3 | made easy | He simplified the fraction. |
| noticeable | adjective | 4 | 3 | easy to see | The change was noticeable. |
| manageable | adjective | 4 | 3 | able to be handled | The homework was manageable. |
| arrangement | noun | 3 | 3 | a planned order | She made a flower arrangement. |
| achievement | noun | 3 | 3 | something done with effort | Winning the award was a great achievement. |
| replacement | noun | 3 | 3 | something that takes the place of another | The store sent a replacement for the broken toy. |
| argument | noun | 3 | 3 | a disagreement | We had an argument about the game. |
| judgment | noun | 2 | 3 | a decision or opinion | Use good judgment. |
| management | noun | 3 | 3 | the act of running or handling something | Good time management helps. |

### g5u7: Latin roots (ject, mit/miss, scrib/script, tract, vert, form)

- TEKS: 5.2B.iii, 5.2B.iv; CCSS: L.5.4.b
- Typical time of year: Jan-Feb
- Tier: core; 20 words
- Rule for kids: ject means throw, mit and miss mean send, scrib and script mean write, tract means pull, vert means turn, form means shape. Knowing the root helps you spell and understand new words.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| project | noun | 2 | 2 | a task that takes several steps | We did a science project. |
| reject | verb | 2 | 3 | to say no to | The machine will reject bent coins. |
| eject | verb | 2 | 3 | to push out | The player will eject the disk. |
| object | noun | 2 | 2 | a thing you can see or touch | The object on the table was a shell. |
| submit | verb | 2 | 3 | to hand in | Submit your paper by Friday. |
| permit | verb | 2 | 3 | to allow | The park will permit dogs on leashes. |
| mission | noun | 2 | 3 | an important task | The astronauts finished their mission. |
| transmit | verb | 2 | 3 | to send out | The tower will transmit the signal. |
| describe | verb | 2 | 2 | to tell about | Describe your favorite toy. |
| script | noun | 1 | 2 | the written words of a play | She memorized her script. |
| subscribe | verb | 2 | 3 | to sign up to get something | I will subscribe to the magazine. |
| attract | verb | 2 | 3 | to pull toward | Flowers attract bees. |
| contract | noun | 2 | 3 | a written agreement | They signed a contract. |
| distract | verb | 2 | 3 | to pull attention away | Do not distract the driver. |
| tractor | noun | 2 | 2 | a farm machine that pulls things | The tractor plowed the field. |
| convert | verb | 2 | 3 | to change into something else | Convert the dollars into coins. |
| reverse | verb | 2 | 3 | to go backward | Reverse the car slowly. |
| universe | noun | 3 | 3 | all of space | The universe is vast. |
| inform | verb | 2 | 3 | to tell | Please inform me of the plan. |
| uniform | noun | 3 | 2 | matching clothing | The team wore a red uniform. |

### g5u8: Greek roots and combining forms (hydr, astro, geo, -ology, meter)

- TEKS: 5.2B.iii, 5.2B.iv; CCSS: L.5.4.b
- Typical time of year: Feb-Mar
- Tier: core; 18 words
- Rule for kids: hydr means water, astro means star, -ology means the study of, meter means measure. Break these long words into their roots to spell them.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| hydrant | noun | 2 | 3 | a street pipe where firefighters get water | The firefighter attached a hose to the hydrant. |
| dehydrate | verb | 3 | 3 | to lose water from the body | Drink water so you do not dehydrate. |
| hydrogen | noun | 3 | 3 | a light gas that is part of water | Water is made of hydrogen and oxygen. |
| astronaut | noun | 3 | 2 | a person who travels in space | The astronaut floated in the shuttle. |
| astronomy | noun | 4 | 3 | the study of stars and planets | He loves astronomy. |
| asteroid | noun | 3 | 3 | a small rocky object in space | An asteroid orbits the sun. |
| geology | noun | 4 | 3 | the study of rocks and earth | Geology tells us how mountains form. |
| ecology | noun | 4 | 3 | the study of living things and their surroundings | Ecology teaches how animals depend on plants. |
| zoology | noun | 4 | 3 | the study of animals | Zoology is about animals. |
| psychology | noun | 4 | 3 | the study of the mind | She studied psychology in college. |
| technology | noun | 4 | 3 | tools made by science | Technology makes life easier. |
| democracy | noun | 4 | 3 | government by the people | The country is a democracy. |
| hemisphere | noun | 3 | 3 | half of the earth | Texas is in the Northern Hemisphere. |
| atmosphere | noun | 3 | 3 | the air around a planet | The atmosphere protects the earth. |
| thermostat | noun | 3 | 3 | a device that controls temperature | Dad turned down the thermostat. |
| diameter | noun | 4 | 3 | the width of a circle | The diameter of the circle is six inches. |
| perimeter | noun | 4 | 3 | the distance around a shape | Find the perimeter of the rectangle. |
| synchronize | verb | 3 | 3 | to make things happen at the same time | The dancers synchronize their steps. |

### g5u9: Commonly confused words and homophones

- TEKS: 5.2B (review of 4.2B.ii); CCSS: L.5.1.d, L.5.2.e
- Typical time of year: Mar-Apr
- Tier: core; 20 words
- Rule for kids: These pairs sound alike or nearly alike. Learn a memory trick for each: affect is an action, effect is a result; stationary means still, stationery is paper.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| affect | verb | 2 | 3 | to change or influence | Weather can affect our plans. |
| effect | noun | 2 | 3 | a result | The effect of rain was mud. |
| accept | verb | 2 | 3 | to take something offered | I accept your invitation. |
| except | preposition | 2 | 3 | but not | Everyone except Sam was there. |
| advice | noun | 2 | 3 | a helpful suggestion | My coach gave me good advice. |
| advise | verb | 2 | 3 | to give suggestions | Teachers advise their students. |
| lose | verb | 1 | 2 | to not win or to misplace | Do not lose your homework. |
| loose | adjective | 1 | 3 | not tight | My tooth is loose. |
| passed | verb | 1 | 3 | went by | The bus passed our house. |
| past | noun | 1 | 2 | time before now | In the past, people rode horses. |
| complement | noun | 3 | 3 | something that completes | Rice is a nice complement to beans. |
| compliment | noun | 3 | 3 | a kind remark | She gave me a compliment. |
| capital | noun | 3 | 3 | a city where government sits | Austin is the capital of Texas. |
| capitol | noun | 3 | 3 | the building where lawmakers meet | We toured the state capitol. |
| council | noun | 2 | 3 | a group that makes decisions | The student council planned the dance. |
| counsel | verb | 2 | 3 | to give advice | The coach will counsel the team. |
| stationary | adjective | 4 | 3 | not moving | The car was stationary at the red light. |
| stationery | noun | 4 | 3 | paper and envelopes | She wrote on pretty stationery. |
| its | pronoun | 1 | 2 | belonging to it | The bird flapped its wings. |
| whose | pronoun | 1 | 3 | belonging to which person | Whose jacket is this? |

### g5u10: Silent letters and borrowed words

- TEKS: 5.2B.iii; CCSS: L.5.2.e
- Typical time of year: Apr-May
- Tier: core; 18 words
- Rule for kids: English borrows words from other languages and keeps odd spellings. Watch for silent letters (debt, column), ph and gh, and the ch that says /sh/ (chef).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| ghost | noun | 1 | 2 | a spooky spirit in stories | The ghost in the story was friendly. |
| rhyme | noun | 1 | 2 | words with the same ending sound | Cat and hat make a rhyme. |
| rhinoceros | noun | 4 | 3 | a big animal with a horn on its nose | A rhinoceros walked across the savanna. |
| knuckle | noun | 2 | 3 | a joint in your finger | He scraped his knuckle. |
| wrestle | verb | 2 | 3 | to grapple as a sport | The brothers wrestle on the mat. |
| whistle | verb | 2 | 3 | to make a high sound with your lips | I can whistle a tune. |
| fasten | verb | 2 | 3 | to attach firmly | Fasten your seatbelt. |
| debt | noun | 1 | 3 | money you owe | He paid off his debt. |
| doubt | noun | 1 | 3 | not being sure | I have no doubt you can do it. |
| subtle | adjective | 2 | 3 | slight and hard to notice | There was a subtle difference in color. |
| plumber | noun | 2 | 3 | a person who fixes pipes | The plumber fixed the sink. |
| column | noun | 2 | 3 | a vertical line of numbers or a pillar | Add the numbers in the first column. |
| autumn | noun | 2 | 3 | the fall season | Leaves turn red in autumn. |
| bouquet | noun | 2 | 3 | a bunch of flowers | She held a bouquet of daisies. |
| ballet | noun | 2 | 3 | a graceful kind of dance | We watched the ballet at the theater. |
| chef | noun | 1 | 2 | a cook in a restaurant | The chef baked a cake. |
| machine | noun | 2 | 3 | a tool with moving parts | The machine sorted the mail. |
| parachute | noun | 3 | 3 | a large cloth used to float down from the sky | The skydiver opened a parachute. |

### g5u11: Irregular plurals

- TEKS: 5.2B.iii, 5.2B.v; CCSS: L.5.2.e
- Typical time of year: May
- Tier: core; 14 words
- Rule for kids: Most nouns add -s or -es. Some end in f and change to ves (wolf, wolves). Words ending in consonant plus o often take -es (potato, potatoes). Some change completely (tooth, teeth).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| leaves | plural noun | 1 | 2 | more than one leaf | The leaves fell from the tree. |
| wolves | plural noun | 1 | 3 | more than one wolf | Wolves howled at the moon. |
| knives | plural noun | 1 | 3 | more than one knife | The knives were put away safely. |
| shelves | plural noun | 1 | 3 | more than one shelf | Books filled the shelves. |
| loaves | plural noun | 1 | 3 | more than one loaf | The baker made six loaves of bread. |
| potatoes | plural noun | 3 | 3 | more than one potato | We baked potatoes for dinner. |
| tomatoes | plural noun | 3 | 3 | more than one tomato | We grew tomatoes in the garden. |
| heroes | plural noun | 2 | 3 | more than one hero | The firefighters are heroes. |
| pianos | plural noun | 3 | 3 | more than one piano | Two pianos stood on the stage. |
| photos | plural noun | 2 | 2 | more than one photograph | We looked at old photos. |
| cacti | plural noun | 3 | 3 | more than one cactus | Cacti grow in the desert. |
| geese | plural noun | 1 | 2 | more than one goose | Geese flew south. |
| teeth | plural noun | 1 | 2 | more than one tooth | Brush your teeth twice a day. |
| women | plural noun | 2 | 3 | more than one woman | The women ran the race. |

### g5hf: High-frequency and frequently misspelled words

- TEKS: 5.2B.iii, 5.2B.v; CCSS: L.5.2.e
- Typical time of year: all year
- Tier: hf; 27 words
- Rule for kids: These words show up in writing all the time. Practice the tricky part of each one.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| achieve | verb | 2 | 3 | to reach a goal | Practice helps you achieve more. |
| address | noun | 2 | 3 | where someone lives or gets mail | Write your address on the envelope. |
| already | adverb | 3 | 2 | before now | I already finished. |
| business | noun | 2 | 3 | a company or shop | Her family runs a small business. |
| embarrass | verb | 3 | 3 | to make someone feel shy or silly | I did not mean to embarrass you. |
| environment | noun | 4 | 3 | the natural world around us | We should protect the environment. |
| familiar | adjective | 3 | 3 | well known | That song is familiar. |
| February | noun | 4 | 3 | the second month | My birthday is in February. |
| foreign | adjective | 2 | 3 | from another country | She is learning a foreign language. |
| government | noun | 3 | 3 | the people who run a country | The government makes laws. |
| grammar | noun | 2 | 3 | the rules for using words | Good grammar makes writing clear. |
| guard | noun | 1 | 3 | a person who protects | The guard stood at the gate. |
| height | noun | 1 | 3 | how tall something is | We measured her height on the wall. |
| interest | noun | 3 | 2 | a feeling of wanting to know more | She has an interest in space. |
| opinion | noun | 3 | 3 | what someone thinks | In my opinion, summer is best. |
| ordinary | adjective | 4 | 3 | usual, not special | It was an ordinary day. |
| recognize | verb | 3 | 3 | to know when you see again | I recognize that song. |
| restaurant | noun | 3 | 3 | a place to buy and eat meals | We ate at a restaurant. |
| schedule | noun | 2 | 3 | a plan with times | Check the bus schedule. |
| sentence | noun | 2 | 2 | words that make a complete thought | Write one sentence. |
| sincere | adjective | 2 | 3 | honest and true | She gave a sincere apology. |
| strength | noun | 1 | 3 | how strong something is | He lifted it with great strength. |
| successful | adjective | 3 | 3 | having reached a goal | The project was successful. |
| unusual | adjective | 4 | 3 | not common | It was an unusual sight. |
| vacuum | noun | 2 | 3 | a machine that sucks up dirt | I used the vacuum to clean the rug. |
| Wednesday | noun | 3 | 3 | the day after Tuesday | We have art on Wednesday. |
| especially | adverb | 4 | 3 | more than usual | I like fruit, especially berries. |

### g5bee: Bee challenge words

- TEKS: 5.2B.iii, 5.2B.iv; CCSS: L.5.2.e
- Typical time of year: all year
- Tier: bee; 18 words
- Rule for kids: Tough words for spelling bee champions. Use roots, syllables and word history to help.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| acquaintance | noun | 3 | 3 | a person you know a little | He is a friendly acquaintance. |
| bureau | noun | 2 | 3 | a chest of drawers or an office | Socks are in the bureau. |
| camouflage | noun | 3 | 3 | a disguise that hides something | The lizard used camouflage. |
| conscience | noun | 2 | 3 | your sense of right and wrong | Her conscience told her to tell the truth. |
| convenience | noun | 3 | 3 | something that saves time or effort | The store is open late for your convenience. |
| curiosity | noun | 5 | 3 | a strong wish to learn | Curiosity led her to explore. |
| equipment | noun | 3 | 3 | tools needed for a job | We carried the camping equipment. |
| exaggerate | verb | 4 | 3 | to say something is bigger than it is | Do not exaggerate the story. |
| guarantee | verb | 3 | 3 | to promise | I guarantee you will love it. |
| hygiene | noun | 2 | 3 | keeping clean to stay healthy | Good hygiene prevents germs. |
| mischievous | adjective | 3 | 3 | playfully naughty | The mischievous puppy chewed a sock. |
| nuisance | noun | 2 | 3 | something that bothers you | The mosquito was a nuisance. |
| pronunciation | noun | 5 | 3 | how a word is said | Her pronunciation was clear. |
| sergeant | noun | 2 | 3 | a military rank | The sergeant led the march. |
| silhouette | noun | 3 | 3 | a dark outline of a shape | A silhouette appeared in the window. |
| thorough | adjective | 2 | 3 | complete and careful | He did a thorough job. |
| ecstatic | adjective | 3 | 3 | extremely happy | She was ecstatic about the win. |
| tournament | noun | 3 | 3 | a series of games | Our team won the tournament. |

## Grade 6

Focus: Dictionary-based spelling and syllabication, Greek and Latin roots and affixes, commonly confused terms, word origins, and academic vocabulary.

### g6u1: Latin roots, set 1 (aqua, ann, bene, cred, dur, fract, lum, mar, mort, nov, ped)

- TEKS: 6.2C, 6.10D.ix; CCSS: L.6.4.b, L.6.2.b
- Typical time of year: Aug-Sep
- Tier: core; 18 words
- Rule for kids: Roots carry meaning. aqua means water, ann means year, cred means believe, dur means last, lum means light, mar means sea, mort means death, nov means new, ped means foot. Break the word into root and ending to spell it.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| aquarium | noun | 4 | 2 | a tank where fish live | We saw jellyfish at the aquarium. |
| aquatic | adjective | 3 | 3 | living or happening in water | Frogs are aquatic animals. |
| annual | adjective | 3 | 2 | happening once a year | The annual fair is in October. |
| anniversary | noun | 5 | 3 | a yearly celebration of an event | It is my parents' anniversary. |
| benefit | noun | 3 | 2 | something that helps | Exercise is a great benefit for your health. |
| benevolent | adjective | 4 | 3 | kind and giving | The benevolent king helped the poor. |
| credible | adjective | 3 | 3 | believable | She gave a credible excuse. |
| incredible | adjective | 4 | 3 | so amazing it is hard to believe | The view was incredible. |
| duration | noun | 3 | 3 | how long something lasts | The duration of the movie is two hours. |
| endure | verb | 2 | 3 | to last or suffer through | Hikers endure long hills. |
| fracture | noun | 2 | 3 | a break in a bone | He had a fracture in his arm. |
| illuminate | verb | 4 | 3 | to light up | Lanterns illuminate the path. |
| marine | adjective | 2 | 3 | having to do with the sea | Marine animals live in the ocean. |
| mariner | noun | 3 | 3 | a sailor | The mariner steered the ship home. |
| novice | noun | 2 | 3 | a beginner | The novice skier took lessons. |
| innovation | noun | 4 | 3 | a new idea or method | The phone was a great innovation. |
| pedestrian | noun | 4 | 3 | a person walking | A pedestrian waited at the crosswalk. |
| popular | adjective | 3 | 2 | liked by many | The game is popular. |

### g6u2: Latin roots, set 2 (cede/ceed, clud/clos, flect, gen, grat, loc, mot, pel, sens, tens)

- TEKS: 6.2C, 6.10D.ix; CCSS: L.6.4.b
- Typical time of year: Sep-Oct
- Tier: core; 20 words
- Rule for kids: cede and ceed mean go, clud and clos mean shut, flect means bend, gen means birth, grat means pleasing, loc means place, mot means move, pel means push, sens means feel. Only three words end in -ceed: proceed, exceed, succeed.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| precede | verb | 2 | 3 | to come before | Spring will precede summer. |
| proceed | verb | 2 | 3 | to go forward | Please proceed to the door. |
| exceed | verb | 2 | 3 | to go beyond | Do not exceed the speed limit. |
| succeed | verb | 2 | 3 | to do well or reach a goal | Hard work helps you succeed. |
| concede | verb | 2 | 3 | to give in or admit | The team had to concede the game. |
| conclude | verb | 2 | 2 | to come to an end | We conclude the show with a song. |
| disclose | verb | 2 | 3 | to make known | Do not disclose the secret. |
| enclose | verb | 2 | 3 | to put inside | Enclose a note with the gift. |
| reflect | verb | 2 | 2 | to bounce back light or think carefully | Mirrors reflect light. |
| generate | verb | 3 | 3 | to produce | Wind turbines generate power. |
| gratitude | noun | 3 | 3 | a feeling of thankfulness | She showed gratitude with a card. |
| legible | adjective | 3 | 3 | clear enough to read | Please make your writing legible. |
| locate | verb | 2 | 2 | to find the place of | Can you locate Texas on the map? |
| motivate | verb | 3 | 3 | to give a reason to act | Good friends motivate us. |
| promote | verb | 2 | 3 | to support or raise up | Posters promote the school play. |
| compel | verb | 2 | 3 | to force or drive | Hunger can compel animals to hunt. |
| expel | verb | 2 | 3 | to push out | Fans expel hot air. |
| impulse | noun | 2 | 3 | a sudden urge | He bought candy on impulse. |
| sensitive | adjective | 3 | 3 | easily hurt or affected | Her skin is sensitive to sun. |
| tension | noun | 2 | 3 | stress or tight stretching | There was tension before the game. |

### g6u3: Greek roots, set 2 (arch, gram, log, morph, path, phil, scope, syn, chron, cycl)

- TEKS: 6.2C; CCSS: L.6.4.b
- Typical time of year: Oct-Nov
- Tier: core; 19 words
- Rule for kids: arch means chief, gram means written, log means word or study, morph means shape, path means feeling, phil means love, scope means see, syn means together, chron means time, cycl means circle.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| anthropology | noun | 5 | 3 | the study of human beings | Anthropology teaches about ancient cultures. |
| architect | noun | 3 | 3 | a person who designs buildings | The architect drew the house. |
| archaeology | noun | 5 | 3 | the study of ancient objects | Archaeology helps us learn about the past. |
| diagram | noun | 3 | 2 | a drawing that explains something | The teacher drew a diagram of the heart. |
| program | noun | 2 | 2 | a plan or show | The school program starts at seven. |
| dialogue | noun | 3 | 3 | a conversation | The play has a funny dialogue. |
| logic | noun | 2 | 2 | clear thinking | Use logic to solve the puzzle. |
| metamorphosis | noun | 5 | 3 | a complete change in form | A caterpillar goes through metamorphosis. |
| sympathy | noun | 3 | 3 | feeling sorry for someone | He showed sympathy for his friend. |
| empathy | noun | 3 | 3 | understanding how another feels | Empathy helps us be kind. |
| philosophy | noun | 4 | 3 | the study of ideas about life | Philosophy asks big questions. |
| kaleidoscope | noun | 4 | 3 | a tube that shows changing patterns | She turned the kaleidoscope to see colors. |
| periscope | noun | 3 | 3 | a tube used to see over objects | The submarine raised its periscope. |
| synonym | noun | 3 | 3 | a word with the same meaning as another | Big is a synonym for large. |
| antonym | noun | 3 | 3 | a word with the opposite meaning | Hot is an antonym of cold. |
| chronological | adjective | 5 | 3 | in time order | List the events in chronological order. |
| cyclone | noun | 2 | 3 | a spinning storm | The cyclone swirled across the sea. |
| encyclopedia | noun | 6 | 3 | a book or website with facts on many topics | I looked it up in the encyclopedia. |
| panorama | noun | 4 | 3 | a wide view | We saw a panorama of the canyon. |

### g6u4: Suffix families (-ity, -ive, -ize, -ify, -ism, -ist)

- TEKS: 6.2C; CCSS: L.6.4.b, L.6.2.b
- Typical time of year: Nov-Dec
- Tier: core; 18 words
- Rule for kids: Suffixes tell the part of speech. -ity makes a noun, -ive makes an adjective, -ize and -ify make verbs, -ism and -ist name a belief or a person. Watch how the base changes (create, creative; electric, electricity).

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| activity | noun | 4 | 2 | something to do | Swimming is my favorite activity. |
| creativity | noun | 5 | 3 | the ability to make new things | Art class lets me use my creativity. |
| electricity | noun | 5 | 3 | power used by lights and machines | The storm knocked out the electricity. |
| security | noun | 4 | 3 | protection or safety | Security guards help keep us safe. |
| capacity | noun | 4 | 3 | the most that can be held | The stadium has a capacity of ten thousand. |
| creative | adjective | 3 | 2 | good at making new things | She wrote a creative story. |
| imaginative | adjective | 5 | 3 | full of new ideas | An imaginative child built a fort. |
| competitive | adjective | 4 | 3 | eager to win | He is a competitive runner. |
| organize | verb | 3 | 2 | to put in order | Organize your desk. |
| memorize | verb | 3 | 2 | to learn by heart | I will memorize the poem. |
| apologize | verb | 4 | 3 | to say sorry | I apologize for being late. |
| clarify | verb | 3 | 3 | to make clear | Can you clarify the directions? |
| classify | verb | 3 | 3 | to put into groups | Scientists classify animals. |
| identify | verb | 4 | 3 | to name or recognize | Can you identify this bird? |
| optimism | noun | 4 | 3 | expecting good things | Her optimism cheered everyone. |
| tourism | noun | 3 | 3 | traveling for fun | Tourism is important in Texas. |
| scientist | noun | 3 | 2 | a person who studies science | The scientist tested the water. |
| specialist | noun | 3 | 3 | an expert in one field | A specialist helped with my allergy. |

### g6u5: Commonly confused terms (TEKS 6.10D.ix)

- TEKS: 6.10D.ix; CCSS: L.6.2.b, L.6.1.e
- Typical time of year: Dec-Jan
- Tier: core; 19 words
- Rule for kids: The state standards name its/it's, affect/effect, there/their/they're and to/two/too. Those are in grades 2 and 5, so review them here with more pairs. Think about what the sentence means before you choose.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| to | preposition | 1 | 1 | toward a place or person | We walked to the library. |
| two | noun | 1 | 1 | the number after one | I have two sisters. |
| too | adverb | 1 | 2 | also, or more than needed | I want to come too. |
| elicit | verb | 3 | 3 | to draw out a response | A good question can elicit a smart answer. |
| than | conjunction | 1 | 2 | used to compare | A horse is bigger than a dog. |
| wear | verb | 1 | 2 | to have clothes on | I wear a coat in winter. |
| led | verb | 1 | 3 | guided in the past | She led the class to the gym. |
| ensure | verb | 2 | 3 | to make certain | Please ensure the door is locked. |
| eminent | adjective | 3 | 3 | famous and respected | The eminent scientist spoke to us. |
| imminent | adjective | 3 | 3 | about to happen | A storm is imminent. |
| farther | adverb | 2 | 3 | at a greater distance | The ball rolled farther down the hill. |
| further | adverb | 2 | 3 | to a greater extent | Let's talk further tomorrow. |
| formally | adverb | 3 | 3 | in a proper, serious way | We dressed formally for the wedding. |
| formerly | adverb | 3 | 3 | in the past | The school was formerly a bank. |
| later | adverb | 2 | 2 | after some time | I will call you later. |
| latter | adjective | 2 | 3 | the second of two things named | Of tea or milk, I chose the latter. |
| moral | noun | 2 | 3 | the lesson of a story | The moral of the fable is to be honest. |
| morale | noun | 2 | 3 | the confidence of a group | The win boosted the team's morale. |
| fewer | adjective | 2 | 3 | a smaller number of | I have fewer pencils than you. |

### g6u6: Academic vocabulary

- TEKS: 6.2A, 6.2B; CCSS: L.6.4.a, L.6.6
- Typical time of year: Jan-Feb
- Tier: core; 18 words
- Rule for kids: These words appear in textbooks and tests. Use a dictionary to check the spelling, syllables and pronunciation.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| analyze | verb | 3 | 3 | to study carefully | Scientists analyze data. |
| approximate | adjective | 4 | 3 | close to exact | The approximate cost is ten dollars. |
| circumstance | noun | 3 | 3 | a condition or fact | Under the circumstance, we stayed home. |
| communicate | verb | 4 | 3 | to share ideas | Phones help us communicate. |
| concentrate | verb | 3 | 3 | to focus your mind | I concentrate on my homework. |
| conclusion | noun | 3 | 3 | the end or final decision | The conclusion of the book surprised me. |
| consequence | noun | 3 | 3 | a result of an action | Missing sleep has a consequence. |
| contrast | noun | 2 | 3 | a difference between things | There is a contrast between day and night. |
| demonstrate | verb | 3 | 3 | to show how | Let me demonstrate the experiment. |
| determine | verb | 3 | 3 | to figure out | We must determine the cause. |
| evaluate | verb | 4 | 3 | to judge the value of | Teachers evaluate our work. |
| factor | noun | 2 | 2 | something that affects an outcome | Weather is a factor in the race. |
| function | noun | 2 | 2 | the purpose of something | What is the function of a leaf? |
| significant | adjective | 4 | 3 | important | It was a significant discovery. |
| summarize | verb | 3 | 3 | to tell the main points | Summarize the chapter in two sentences. |
| technique | noun | 2 | 3 | a way of doing something | She learned a new painting technique. |
| theory | noun | 3 | 3 | an idea that tries to explain something | Scientists test each theory. |
| interpret | verb | 3 | 3 | to explain the meaning of | Let me interpret the map. |

### g6u7: Silent and unusual letters in advanced words

- TEKS: 6.2A, 6.2C; CCSS: L.6.2.b
- Typical time of year: Feb-Mar
- Tier: core; 18 words
- Rule for kids: These words keep letters that are no longer pronounced, like the p in pneumonia and the h in honest. Use the dictionary to check the pronunciation and origin of each one.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| pneumonia | noun | 4 | 3 | a lung illness | The word pneumonia starts with a silent p. |
| mnemonic | noun | 3 | 3 | a trick to help you remember | Use a mnemonic to learn the planets. |
| rhetoric | noun | 3 | 3 | the art of persuasive speaking | The speaker used powerful rhetoric. |
| receipt | noun | 2 | 3 | a paper showing you paid | Keep the receipt. |
| heir | noun | 1 | 3 | a person who inherits | The prince was heir to the throne. |
| honest | adjective | 2 | 2 | truthful | She is always honest. |
| honor | noun | 2 | 3 | great respect | It is an honor to meet you. |
| exhibit | noun | 3 | 3 | a display of objects | The art exhibit was beautiful. |
| exhaust | verb | 2 | 3 | to use up all of something | Do not exhaust the supplies. |
| gauge | noun | 1 | 3 | a tool for measuring | The gauge showed the tank was full. |
| vague | adjective | 1 | 3 | not clear | His directions were vague. |
| league | noun | 1 | 3 | a group of sports teams | She plays in the soccer league. |
| fatigue | noun | 2 | 3 | extreme tiredness | Fatigue set in after the hike. |
| antique | adjective | 2 | 3 | old and valuable | Grandma has an antique clock. |
| tongue | noun | 1 | 3 | the part of your mouth used for tasting | Stick out your tongue. |
| solemn | adjective | 2 | 3 | serious | The ceremony was solemn. |
| hymn | noun | 1 | 3 | a song of praise | The choir sang a hymn. |
| condemn | verb | 2 | 3 | to say something is bad | Leaders condemn violence. |

### g6u8: Advanced endings (-eous, -ious, -ible, -able)

- TEKS: 6.2C; CCSS: L.6.2.b, L.6.4.b
- Typical time of year: Mar-Apr
- Tier: core; 18 words
- Rule for kids: Adjectives often end in -ous (full of) or -ible and -able (can be done). Say each syllable clearly, then match the ending to the pattern: courteous, responsible, adorable.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| courteous | adjective | 3 | 3 | polite and respectful | The courteous clerk helped us. |
| gorgeous | adjective | 2 | 3 | very beautiful | The sunset was gorgeous. |
| hideous | adjective | 3 | 3 | very ugly or silly-scary | The cartoon monster looked hideous but silly. |
| outrageous | adjective | 3 | 3 | shocking or extreme | The price was outrageous. |
| spontaneous | adjective | 4 | 3 | done without planning | The spontaneous picnic was fun. |
| conscious | adjective | 2 | 3 | awake and aware | She was conscious after the nap. |
| ferocious | adjective | 3 | 3 | fierce | A ferocious lion roared. |
| tremendous | adjective | 3 | 3 | very large | There was a tremendous cheer. |
| hazardous | adjective | 3 | 3 | dangerous | Icy roads are hazardous. |
| ridiculous | adjective | 4 | 3 | so silly it is funny | It was a ridiculous joke. |
| responsible | adjective | 4 | 3 | able to be trusted | She is responsible and does her chores. |
| accessible | adjective | 4 | 3 | easy to reach or enter | The library is accessible to everyone. |
| compatible | adjective | 4 | 3 | able to work together | The two games are compatible. |
| reversible | adjective | 4 | 3 | able to be turned around | He wore a reversible jacket. |
| plausible | adjective | 3 | 3 | seeming likely | It was a plausible explanation. |
| tangible | adjective | 3 | 3 | able to be touched | The trophy was a tangible reward. |
| edible | adjective | 3 | 3 | safe to eat | These berries are edible. |
| adorable | adjective | 4 | 3 | very cute | The adorable puppy wagged its tail. |

### g6u9: Double consonants and tricky spellings

- TEKS: 6.2A; CCSS: L.6.2.b
- Typical time of year: Apr
- Tier: core; 18 words
- Rule for kids: Many hard words have double letters in unexpected places, like accommodate (two c's, two m's). Make up a memory trick and check the dictionary.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| accommodate | verb | 4 | 3 | to make room for | The hotel can accommodate fifty guests. |
| accumulate | verb | 4 | 3 | to gather over time | Dust will accumulate on shelves. |
| appreciate | verb | 4 | 3 | to be grateful for | I appreciate your help. |
| assistance | noun | 3 | 3 | help | She offered assistance. |
| committee | noun | 3 | 3 | a group chosen for a job | The committee planned the fair. |
| correspond | verb | 3 | 3 | to match or to write letters | My friend and I correspond by mail. |
| occurrence | noun | 3 | 3 | an event or happening | A rainbow is a rare occurrence. |
| opponent | noun | 3 | 3 | a person you compete against | He shook hands with his opponent. |
| possession | noun | 3 | 3 | something you own | The book is my favorite possession. |
| recommend | verb | 3 | 3 | to suggest | I recommend this book. |
| success | noun | 2 | 2 | achieving a goal | The play was a success. |
| suggest | verb | 2 | 2 | to offer an idea | I suggest we take a break. |
| millennium | noun | 4 | 3 | a period of a thousand years | The year 2000 started a new millennium. |
| questionnaire | noun | 3 | 3 | a set of written questions | Fill out the questionnaire. |
| embarrassment | noun | 4 | 3 | a feeling of shyness or shame | He turned red with embarrassment. |
| disappointed | adjective | 4 | 3 | sad because hopes were not met | I was disappointed when it rained. |
| irresistible | adjective | 5 | 3 | too good to say no to | The smell of fresh bread was irresistible. |
| unnecessary | adjective | 5 | 3 | not needed | The extra step was unnecessary. |

### g6u10: Same spelling, different stress (record, present, content)

- TEKS: 6.2A; CCSS: L.6.4.c, RF.6.4
- Typical time of year: May
- Tier: core; 15 words
- Rule for kids: Some words are spelled the same but stressed differently as nouns and verbs: REcord (noun) vs. reCORD (verb). Use the dictionary for the syllables and pronunciation.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| record | noun | 2 | 2 | a written account or best score | She set a school record. |
| present | noun | 2 | 2 | a gift | I wrapped a present for my aunt. |
| content | noun | 2 | 3 | what is inside something | The content of the box was a surprise. |
| produce | verb | 2 | 2 | to make | Cows produce milk. |
| refuse | verb | 2 | 3 | to say no | Do not refuse help. |
| subject | noun | 2 | 2 | a topic or school class | Science is my favorite subject. |
| conduct | verb | 2 | 3 | to lead or guide | The teacher will conduct the choir. |
| increase | verb | 2 | 2 | to grow larger | Prices increase every year. |
| protest | noun | 2 | 3 | a public show of disagreement | They held a peaceful protest. |
| rebel | noun | 2 | 3 | a person who fights the rules | The rebel left the camp. |
| conflict | noun | 2 | 3 | a disagreement or fight | The story has a big conflict. |
| progress | noun | 2 | 3 | moving forward | We made progress on the project. |
| insult | noun | 2 | 3 | a rude remark | Do not insult others. |
| survey | noun | 2 | 3 | a set of questions asked to many people | We took a survey of the class. |
| suspect | verb | 2 | 3 | to think something is true | I suspect it will snow. |

### g6u11: Word origins (borrowed words and Texas words)

- TEKS: 6.2A; CCSS: L.6.4.c
- Typical time of year: May
- Tier: core; 19 words
- Rule for kids: Many English words came from other languages. Spanish gave Texas rodeo, ranch and patio. Use a dictionary to look up where a word came from and how to spell it.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| rodeo | noun | 3 | 2 | a show where cowboys ride horses | We watched the rodeo in Fort Worth. |
| ranch | noun | 1 | 1 | a large farm for cattle | The family lives on a ranch. |
| lasso | noun | 2 | 3 | a rope with a loop for catching animals | The cowboy threw the lasso. |
| mesa | noun | 2 | 3 | a flat-topped hill | The mesa rose above the desert. |
| patio | noun | 3 | 2 | an outdoor space beside a house | We ate dinner on the patio. |
| plaza | noun | 2 | 2 | a public square | The band played in the plaza. |
| bayou | noun | 2 | 3 | a slow, marshy stream | Egrets stood in the bayou. |
| armadillo | noun | 4 | 3 | an animal with a hard shell, the Texas state small mammal | An armadillo rolled into a ball. |
| mustang | noun | 2 | 3 | a wild horse of the plains | A mustang ran across the prairie. |
| stampede | noun | 2 | 3 | a sudden rush of cattle | The cattle began a stampede. |
| tortilla | noun | 3 | 3 | a flat bread made of corn or flour | She wrapped the beans in a tortilla. |
| canyon | noun | 2 | 3 | a deep valley with steep sides | We hiked in Palo Duro Canyon. |
| barbecue | noun | 3 | 3 | food cooked slowly over a fire | We had barbecue at the picnic. |
| bonanza | noun | 3 | 3 | a rich find or great source of success | The farmer's market was a bonanza. |
| vanilla | noun | 3 | 3 | a sweet flavor from a plant | I like vanilla ice cream. |
| kayak | noun | 2 | 3 | a small boat paddled with two blades | We paddled a kayak down the river. |
| tsunami | noun | 3 | 3 | a giant ocean wave | The tsunami reached the shore. |
| safari | noun | 3 | 3 | a trip to see wild animals | We went on a safari in Africa. |
| pajamas | plural noun | 3 | 3 | clothes for sleeping | I put on my pajamas. |

### g6hf: Frequently misspelled words

- TEKS: 6.2A, 6.10D.ix; CCSS: L.6.2.b
- Typical time of year: all year
- Tier: hf; 27 words
- Rule for kids: These words are tricky for lots of writers. Make a memory trick for the hard part, and check a dictionary.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| apparent | adjective | 3 | 3 | easy to see | It was apparent that she was tired. |
| argue | verb | 2 | 2 | to disagree in words | Friends sometimes argue. |
| category | noun | 4 | 3 | a group of similar things | Sort them by category. |
| ceremony | noun | 4 | 3 | a formal event for a special occasion | The graduation ceremony was exciting. |
| definitely | adverb | 4 | 3 | without doubt | I will definitely be there. |
| dilemma | noun | 3 | 3 | a hard choice | She faced a dilemma. |
| diploma | noun | 3 | 3 | a paper showing you finished school | She was proud to get her diploma. |
| existence | noun | 3 | 3 | being alive or real | The existence of dinosaurs is proven. |
| experiment | noun | 4 | 3 | a test to learn something | We did an experiment in science. |
| fascinating | adjective | 4 | 3 | extremely interesting | The book was fascinating. |
| generally | adverb | 4 | 2 | usually | Generally, we eat at six. |
| grateful | adjective | 2 | 2 | thankful | I am grateful for my friends. |
| immediately | adverb | 5 | 3 | right away | Come here immediately. |
| independent | adjective | 4 | 3 | not needing others | He is an independent reader. |
| intelligent | adjective | 4 | 3 | smart | The intelligent dog learned tricks. |
| license | noun | 2 | 3 | official permission | Dad showed his driver's license. |
| maintenance | noun | 3 | 3 | upkeep and care | The bus needs maintenance. |
| occasionally | adverb | 5 | 3 | from time to time | We occasionally eat out. |
| original | adjective | 4 | 3 | first or new | She wrote an original song. |
| perseverance | noun | 4 | 3 | not giving up | Perseverance helped her win. |
| privilege | noun | 3 | 3 | a special right | Voting is a privilege. |
| pronounce | verb | 2 | 3 | to say a word | How do you pronounce this word? |
| responsibility | noun | 6 | 3 | a duty you must do | Feeding the dog is my responsibility. |
| truly | adverb | 2 | 3 | really | I truly love my family. |
| vocabulary | noun | 5 | 3 | all the words you know | Reading builds vocabulary. |
| separately | adverb | 4 | 3 | apart | They were sent separately. |
| acquire | verb | 2 | 3 | to get | We acquire new skills with practice. |

### g6bee: Bee challenge words

- TEKS: 6.2A, 6.2C; CCSS: L.6.2.b
- Typical time of year: all year
- Tier: bee; 20 words
- Rule for kids: Championship-level words. Listen to the definition, ask about the language of origin, say each syllable, then spell.

| Word | POS | Syl | D | Definition | Example sentence |
|---|---|---|---|---|---|
| abbreviation | noun | 5 | 3 | a short form of a word | Dr. is an abbreviation for doctor. |
| catastrophe | noun | 4 | 3 | a big disaster | Rain on picnic day felt like a catastrophe, but we laughed. |
| chrysalis | noun | 3 | 3 | the stage of a butterfly in a cocoon | The chrysalis hung from a branch. |
| conscientious | adjective | 4 | 3 | careful and hardworking | A conscientious student checks the answers. |
| deteriorate | verb | 5 | 3 | to get worse | Metal can deteriorate in rain. |
| entrepreneur | noun | 4 | 3 | a person who starts a business | The entrepreneur opened a bakery. |
| impeccable | adjective | 4 | 3 | without any flaws | Her manners are impeccable. |
| jeopardy | noun | 3 | 3 | danger | The nest was in jeopardy. |
| lieutenant | noun | 3 | 3 | an officer in the military | The lieutenant gave orders. |
| masquerade | noun | 3 | 3 | a party where people wear masks | They attended a masquerade ball. |
| miscellaneous | adjective | 5 | 3 | of various kinds | The box held miscellaneous items. |
| onomatopoeia | noun | 6 | 3 | a word that sounds like its meaning | Buzz is an example of onomatopoeia. |
| pharaoh | noun | 2 | 3 | a ruler of ancient Egypt | The pharaoh wore a gold crown. |
| phenomenon | noun | 4 | 3 | a remarkable event | A rainbow is a natural phenomenon. |
| quarantine | noun | 3 | 3 | a time apart to stop spreading illness | The ship was in quarantine. |
| rendezvous | noun | 3 | 3 | a planned meeting | We had a rendezvous at the park. |
| surveillance | noun | 3 | 3 | close watching | Cameras provide surveillance. |
| tyrannosaurus | noun | 5 | 3 | a large meat-eating dinosaur | The tyrannosaurus roared in the movie. |
| ambassador | noun | 4 | 3 | a person who represents a country abroad | The ambassador shook hands with the mayor. |
| xylophone | noun | 3 | 3 | a musical instrument with wooden bars | She played a tune on the xylophone. |

## Gaps and cautions

- Bluebonnet scope and sequence, UFLI overview PDF and CKLA lesson content were not read in full (fetch errors / not open); order is conventional rather than copied.
- TEKS 2.2C and 5.2B sub-items came from Teach Starter; the TEA PDFs for grades 2 and 5 were not retrievable here.
- CCSS sub-letter codes (RF.x.3.a-g, L.x.2.a-g) are from the standards' known structure; only parent statements were fetched.
- Syllable counts and difficulty ratings are hand-assigned; run a dictionary check before launch (words like `fire` forms, `really`, `usually`).
- Several homophone and commonly-confused words (e.g. its/it's, their/there/they're) are spread across grades 2, 5 and 6 because `word` must be unique in the DB.
- Kid-safe tone was checked by hand; a quick human skim is still recommended.
- The app blanks sentences with an exact-word regex; irregular inflected forms are listed as separate words so each sentence contains its own word.

## Sources and licenses

| Source | URL | License / reuse notes | Used for |
|---|---|---|---|
| TEA grade 1 ELAR TEKS (19 TAC 110.3) PDF, June 2024 | https://tea.texas.gov/academics/curriculum-standards/teks/grade1-teks-062024.pdf | Texas state rule text, published by TEA. Standards text is government work; cited as reference, not copied beyond short quotes. Could not open this PDF directly (404 through the fetcher); content confirmed through the TEKS Guide page and TEA breakouts below. | 1.2C.i-iv |
| TEKS Guide, ELA.1.2.C | https://teksguide.org/teks/ela12c/alignments | Mirror of the TEKS by the Texas Gateway / TEA project; reference only. | exact wording of 1.2C.i-iv |
| TEA Proclamation 2019 Breakout, ELAR Spelling Grade 1 | https://tea.texas.gov/curriculum-and-instruction/instructional-materials/review-and-adoption-process/breakout-documents/p2019-breakout-elar-spelling-grade-1-final.pdf | TEA publication; reference only. | 1.2C sub-items |
| TEA Proclamation 2019 Breakout, ELAR Spelling Grade 3 | https://tea.texas.gov/curriculum-and-instruction/instructional-materials/review-and-adoption-process/breakout-documents/p2019-breakout-elar-spelling-grade-3-revised-1-12-2018.pdf | TEA publication; reference only. | 3.2B.i-vii (read directly) |
| TEA Proclamation 2019 Breakout, ELAR Spelling Grade 4 | https://tea.texas.gov/curriculum-and-instruction/instructional-materials/review-and-adoption-process/breakout-documents/p2019-breakout-elar-spelling-grade-4-final.pdf | TEA publication; reference only. | 4.2B.i-vi (read directly) |
| TEA Proclamation 2019 Breakout, ELAR Grade 6 | https://tea.texas.gov/curriculum-and-instruction/instructional-materials/review-and-adoption-process/breakout-documents/p2019-breakout-elar-grade-6-final.pdf | TEA publication; reference only. | 6.2A (print/digital resources for syllabication, pronunciation, word origin) and 6.10D.ix (correct spelling incl. commonly confused terms) |
| TEA Proclamation 2019 Breakout, ELAR Spelling Grade 5 (listed in search; not opened) | https://tea.texas.gov/academics/instructional-materials/review-and-adoption-process/breakout-documents/p2019breakoutelarspelling-grade-5-final-revised.pdf | TEA publication; reference only. Link 404 when fetched directly. | not used directly; see teachstarter below |
| Teach Starter, TEKS ELAR 2.2(C) | https://www.teachstarter.com/teks/elar/elar-2/elar-2-2/elar-2-2c | Third-party transcription of the TEKS. Used only to read standard wording; verify against TEA. | 2.2C items i-vi (silent letters, compound/contractions/abbreviations, multisyllabic, syllable division with double consonants, un-/re-/dis- and inflectional endings, alphabetizing). The first item(s) of 2.2C were not shown by the fetcher; confirm vs TEA. |
| Teach Starter, TEKS ELAR 5.2(B) | https://www.teachstarter.com/teks/elar/elar-5/elar-5-2/elar-5-2b | Third-party transcription of the TEKS; verify against TEA. | 5.2B items (consonant changes /t/ to /sh/, /k/ to /sh/; multisyllabic; advanced syllable division; prefixes; suffixes) |
| TEKS Guide, ELA.6.2.A | https://teksguide.org/teks/ela62a/alignments | Mirror of the TEKS; reference only. | 6.2A wording |
| TEA Bluebonnet Learning (K-5 RLA, K-3 Foundational Skills) | https://tea.texas.gov/academics/instructional-materials/bluebonnet-learning | State-developed, SBOE-approved open education resource (OER); free to access. The page names no Creative Commons or other license; ask the TEA Instructional Materials Help Desk before reusing text. Not copied. | Context only: confirms existence and TEKS coverage. The Bluebonnet phonics/spelling scope and sequence PDF was NOT retrieved, so unit order below follows TEKS, UFLI-style progression and common grade-level practice, not Bluebonnet lesson order. |
| Common Core State Standards, ELA Language (L.1-L.6), e.g. L.3.2 | https://www.thecorestandards.org/ELA-Literacy/L/3/2/ | (c) 2010 NGA Center for Best Practices and CCSSO. Provided under a public license (free to use with attribution). Standard numbers only are cited here. | L.x.2 and L.x.4 codes. Sub-letter codes (e.g. RF.1.3.b, L.2.2.c) come from the published standards and from memory of their structure; only the parent statements for L.3.2 and RF.2.3 were fetched. |
| Common Core State Standards, Reading Foundational Skills RF.2.3 | https://www.thecorestandards.org/ELA-Literacy/RF/2/3/ | Same as above. | RF.1.3-RF.5.3 codes |
| UFLI Foundations (University of Florida Literacy Institute) | https://ufli.education.ufl.edu/ | Free to use for instruction; UFLI materials are copyrighted by UF. Reference for ordering only. Could not fetch the overview PDF (404); relied on third-party descriptions (128 lessons, 14 phases from alphabet and short vowels to long vowels, r-controlled, suffixes). | Ordering of G1 units (short vowels, digraphs, blends, VCe, vowel teams, r-controlled, endings) |
| Core Knowledge Language Arts (CKLA) Skills strand scope and sequence, Amplify/Core Knowledge | https://www.coreknowledge.org/wp-content/uploads/2017/06/CKLA_G3_Scope-and-Sequence_Skills-.pdf | Core Knowledge originals were released under CC BY-NC-SA 3.0 (a 2012 curriculum map states this); some Amplify copies carry (c) Amplify, all rights reserved. Treated as reference only; no CKLA word lists or sequences were copied. | Cross-check of G2-G3 spelling order |
| Dolch Basic Sight Word List (E. W. Dolch, 1936/1948) | https://en.wikipedia.org/wiki/Dolch_word_list | Original lists are reported to be public domain (out of copyright); secondary sources only, not legal advice. Individual common words are not protectable in any case. High-frequency words in this file are my own selection informed by Dolch/Fry difficulty, with original sentences. | High-frequency word selection |
| Fry Instant Words (Edward Fry) | https://www.uen.org/earlylearning/word_lists.shtml | NOT public domain. Copyright holder is Edward Fry (estate/Sensible Solutions); teacher sites reprint it for classroom use with permission notices. This curriculum does not reproduce Fry lists or their ordering; use only the idea of a research-based frequency list. | Checked for reuse status only |
| Words Their Way developmental spelling stages (Bear, Invernizzi, Templeton, Johnston) | https://www.pearson.com/ | Commercial publisher text. Reference only: stages (letter name-alphabetic, within word pattern, syllables and affixes, derivational relations) informed grade pacing. No lists copied. | Pacing rationale |
