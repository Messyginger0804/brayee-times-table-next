// Pure helpers for scripts/import-spelling.js (no DB access here).

const FILL_KEYS = (w) => [['grade', w.grade], ['unitId', w.unitId], ['tier', w.tier], ['syllables', w.syllables], ['source', w.source], ['category', w.category ?? w.unitId]];

/** Row to insert for a spec word that is not in the table yet. */
function toInsertRow(w) {
  return {
    word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech, sentence: w.sentence,
    difficulty: w.difficulty, category: w.category ?? w.unitId, active: w.active !== false,
    grade: w.grade, unitId: w.unitId, tier: w.tier, syllables: w.syllables, source: w.source || 'original',
  };
}

/** Only the NULL columns of `row` that the spec word can supply. */
function fillFromSpec(row, w) {
  const fill = {};
  for (const [k, v] of FILL_KEYS(w)) {
    if (row[k] == null && v != null) fill[k] = v;
  }
  return fill;
}

/** NULL columns of a legacy row that the classification entry can supply. */
function fillFromLegacy(row, c) {
  const fill = {};
  if (row.grade == null) fill.grade = c.grade;
  if (row.unitId == null) fill.unitId = c.unitId;
  if (row.category == null) fill.category = c.unitId;
  if (row.source == null) fill.source = 'legacy';
  return fill;
}

const hasKeys = (o) => Object.keys(o).length > 0;

/**
 * Work out inserts / null-fill updates for the spec's words.
 * @returns {{ toInsert: object[], updates: {id:any,data:object}[], conflicts: number, seen: Set<string> }}
 */
function planSpecWords(words, byWord) {
  const plan = { toInsert: [], updates: [], conflicts: 0, seen: new Set() };
  for (const w of words) {
    if (plan.seen.has(w.word)) continue; // (word, grade) is unique in the spec; word is unique in the table
    plan.seen.add(w.word);
    const row = byWord.get(w.word);
    if (!row) { plan.toInsert.push(toInsertRow(w)); continue; }
    if (row.grade != null && row.grade !== w.grade) { plan.conflicts++; continue; }
    const fill = fillFromSpec(row, w);
    if (hasKeys(fill)) plan.updates.push({ id: row.id, data: fill });
  }
  return plan;
}

/**
 * Legacy rows: fill NULLs from the classification (these words are not in spec.words).
 * @returns {{ updates: {id:any,data:object}[], missing: number }}
 */
function planLegacyWords(classification, byWord, seen) {
  const out = { updates: [], missing: 0 };
  for (const c of classification) {
    if (seen.has(c.word)) continue;
    const row = byWord.get(c.word);
    if (!row) { out.missing++; continue; }
    const fill = fillFromLegacy(row, c);
    if (hasKeys(fill)) out.updates.push({ id: row.id, data: fill });
  }
  return out;
}

module.exports = { toInsertRow, fillFromSpec, fillFromLegacy, planSpecWords, planLegacyWords };
