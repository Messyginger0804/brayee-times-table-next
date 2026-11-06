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
const { planSpecWords, planLegacyWords } = require('./lib/spellingImport');

const DRY = process.argv.includes('--dry-run');
const file = path.join(__dirname, '..', 'docs', 'curriculum', 'spelling.json');

function dbHost() {
  return (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/[?].*$/, '');
}

async function writePlan(prisma, toInsert, updates) {
  for (let i = 0; i < toInsert.length; i += 500) {
    await prisma.spellingWord.createMany({ data: toInsert.slice(i, i + 500), skipDuplicates: true });
  }
  for (const u of updates) await prisma.spellingWord.update({ where: { id: u.id }, data: u.data });
}

async function importWords(prisma, spec) {
  const existing = await prisma.spellingWord.findMany();
  const byWord = new Map(existing.map((r) => [r.word, r]));
  // Dedupe by word (last classification wins, as before)
  const classification = [...new Map(spec.existingWordsClassification.map((c) => [c.word, c])).values()];

  const specPlan = planSpecWords(spec.words, byWord);
  const legacy = planLegacyWords(classification, byWord, specPlan.seen);
  const updates = [...specPlan.updates, ...legacy.updates];

  if (!DRY) await writePlan(prisma, specPlan.toInsert, updates);
  const total = await prisma.spellingWord.count();
  console.log(JSON.stringify({
    inserted: specPlan.toInsert.length, updated: updates.length, gradeConflictsSkipped: specPlan.conflicts,
    legacyNotFound: legacy.missing, totalRows: total, dryRun: DRY,
  }));
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const prisma = new PrismaClient();
  console.log(`Target db: ${dbHost() || '(DATABASE_URL not set)'}${DRY ? '  [dry run]' : ''}`);
  try {
    await importWords(prisma, spec);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
