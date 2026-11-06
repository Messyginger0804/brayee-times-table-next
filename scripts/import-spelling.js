#!/usr/bin/env node
/**
 * Idempotent import of docs/curriculum/spelling.json into SpellingWord.
 *
 *  - New words (no row with that word) are inserted.
 *  - Existing rows (the 54 legacy words) only get NULL fields filled
 *    (grade, unitId, category, source) from existingWordsClassification. Non-null values are never overwritten
 *    and nothing is deleted.
 *  - Rows that already exist with a different non-null grade are left alone and reported.
 *
 * Usage: DATABASE_URL=... node scripts/import-spelling.js [--dry-run]
 * (db:import-spelling runs it with the DATABASE_URL already in your environment; it never reads .env.vercel.production.)
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const DRY = process.argv.includes('--dry-run');
const file = path.join(__dirname, '..', 'docs', 'curriculum', 'spelling.json');

async function main() {
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const prisma = new PrismaClient();
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/[?].*$/, '');
  console.log(`Target db: ${host || '(DATABASE_URL not set)'}${DRY ? '  [dry run]' : ''}`);
  try {
    const existing = await prisma.spellingWord.findMany();
    const byWord = new Map(existing.map((r) => [r.word, r]));
    const classification = new Map(spec.existingWordsClassification.map((c) => [c.word, c]));

    const toInsert = [];
    let conflicts = 0;
    const updates = [];
    const seen = new Set();

    for (const w of spec.words) {
      if (seen.has(w.word)) continue; // (word, grade) is unique in the spec; word is unique in the table
      seen.add(w.word);
      const row = byWord.get(w.word);
      if (!row) {
        toInsert.push({
          word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech, sentence: w.sentence,
          difficulty: w.difficulty, category: w.category ?? w.unitId, active: w.active !== false,
          grade: w.grade, unitId: w.unitId, tier: w.tier, syllables: w.syllables, source: w.source || 'original',
        });
        continue;
      }
      if (row.grade != null && row.grade !== w.grade) { conflicts++; continue; }
      const fill = {};
      for (const [k, v] of [['grade', w.grade], ['unitId', w.unitId], ['tier', w.tier], ['syllables', w.syllables], ['source', w.source], ['category', w.category ?? w.unitId]]) {
        if (row[k] == null && v != null) fill[k] = v;
      }
      if (Object.keys(fill).length) updates.push({ id: row.id, data: fill });
    }

    // legacy rows: fill NULLs from the classification (these words are not in spec.words)
    let legacyMissing = 0;
    for (const c of classification.values()) {
      if (seen.has(c.word)) continue;
      const row = byWord.get(c.word);
      if (!row) { legacyMissing++; continue; }
      const fill = {};
      if (row.grade == null) fill.grade = c.grade;
      if (row.unitId == null) fill.unitId = c.unitId;
      if (row.category == null) fill.category = c.unitId;
      if (row.source == null) fill.source = 'legacy';
      if (Object.keys(fill).length) updates.push({ id: row.id, data: fill });
    }

    if (!DRY) {
      for (let i = 0; i < toInsert.length; i += 500) {
        await prisma.spellingWord.createMany({ data: toInsert.slice(i, i + 500), skipDuplicates: true });
      }
      for (const u of updates) await prisma.spellingWord.update({ where: { id: u.id }, data: u.data });
    }
    const total = await prisma.spellingWord.count();
    console.log(JSON.stringify({ inserted: toInsert.length, updated: updates.length, gradeConflictsSkipped: conflicts, legacyNotFound: legacyMissing, totalRows: total, dryRun: DRY }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
