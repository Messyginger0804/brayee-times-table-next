#!/usr/bin/env node
/**
 * One-time account cleanup for the "one real account + guest seats" model.
 *
 *  - KEEP     : the user named exactly "Braylee" (row and PIN untouched, level = highest of her accounts).
 *  - MERGE    : exactly "braylee", "bray", "Bray" are merged into KEEP, then deleted. Their Attempt, Test,
 *               SpellingAttempt, MathAttempt rows are re-pointed; UserProblem and MathSkillProgress rows that clash on
 *               (userId, problemId|skillId) are merged (see below).
 *  - DELETE   : every other non-guest user and all of their data. Guest seat rows (isGuest) are never touched.
 *  - Names are matched EXACTLY (case-sensitive). No fuzzy matching.
 *
 * UserProblem merge   : everCorrect = OR, updatedAt = latest, mastered = lib/mastery.js on the merged attempt history
 *                       (falls back to OR when the module cannot be loaded or there are no attempts).
 * MathSkillProgress   : attempts/correct summed, levelIndex = highest, `recent` window = the highest level's window
 *                       (both accounts at the same level: oldest-first by updatedAt, last 20), mastered = OR,
 *                       masteredAt/updatedAt = latest, createdAt = earliest, unlockedByParent = OR.
 *
 * Usage:  node scripts/cleanup-accounts.js                # dry run (default): does everything, then rolls back
 *         node scripts/cleanup-accounts.js --confirm      # writes (ONE transaction)
 *         add --i-have-a-backup to run against a non-localhost DATABASE_URL
 * Idempotent: a second --confirm finds nothing left to merge or delete.
 */
const { PrismaClient } = require('@prisma/client');

const KEEP = 'Braylee';
const MERGE = ['braylee', 'bray', 'Bray'];

const args = new Set(process.argv.slice(2));
const CONFIRM = args.has('--confirm');
const HAS_BACKUP = args.has('--i-have-a-backup');

class Rollback extends Error {}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^\[|\]$/g, ''); } catch (_) { return null; }
}

async function loadIsMastered() {
  try {
    const m = await import('../lib/mastery.js');
    if (typeof m.isMastered === 'function') return m.isMastered;
  } catch (_) { /* older Node cannot import extensionless-ESM .js */ }
  return null;
}

const maxDate = (...ds) => ds.filter(Boolean).reduce((a, b) => (a && a > b ? a : b), null);
const minDate = (...ds) => ds.filter(Boolean).reduce((a, b) => (a && a < b ? a : b), null);

function mergeProgress(rows) {
  const top = Math.max(...rows.map((r) => r.levelIndex));
  const atTop = rows.filter((r) => r.levelIndex === top).sort((a, b) => a.updatedAt - b.updatedAt);
  const recent = [];
  for (const r of atTop) recent.push(...(Array.isArray(r.recent) ? r.recent : []));
  return {
    levelIndex: top,
    recent: recent.slice(-20),
    attempts: rows.reduce((n, r) => n + r.attempts, 0),
    correct: rows.reduce((n, r) => n + r.correct, 0),
    mastered: rows.some((r) => r.mastered),
    masteredAt: maxDate(...rows.map((r) => r.masteredAt)),
    unlockedByParent: rows.some((r) => r.unlockedByParent),
    createdAt: minDate(...rows.map((r) => r.createdAt)),
    updatedAt: maxDate(...rows.map((r) => r.updatedAt)),
  };
}

async function run(tx, isMastered, log) {
  const keep = await tx.user.findUnique({ where: { name: KEEP } });
  if (!keep) throw new Error(`No user named exactly "${KEEP}" - refusing to continue`);
  const dupes = await tx.user.findMany({ where: { name: { in: MERGE }, isGuest: false }, orderBy: { id: 'asc' } });
  const dupeIds = dupes.map((u) => u.id);
  const others = await tx.user.findMany({
    where: { isGuest: false, name: { notIn: [KEEP, ...MERGE] } },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
  const otherIds = others.map((u) => u.id);

  const braylAttemptsBefore = await tx.attempt.count({ where: { userId: keep.id } });
  log(`keep   : ${KEEP} (id ${keep.id}), ${braylAttemptsBefore} attempts`);
  log(`merge  : ${dupes.length ? dupes.map((u) => `${u.name}(id ${u.id})`).join(', ') : '(none left)'}  [looked for ${MERGE.join(', ')}]`);
  log(`delete : ${others.length} users${others.length ? ': ' + others.map((u) => u.name).join(', ') : ''}`);

  const stats = { moved: {}, userProblemConflicts: 0, mathConflicts: 0, deleted: {} };

  if (dupeIds.length) {
    const ids = [keep.id, ...dupeIds];
    for (const [label, model] of [['Attempt', 'attempt'], ['Test', 'test'], ['SpellingAttempt', 'spellingAttempt'], ['MathAttempt', 'mathAttempt']]) {
      const r = await tx[model].updateMany({ where: { userId: { in: dupeIds } }, data: { userId: keep.id } });
      stats.moved[label] = r.count;
    }

    // UserProblem
    const ups = await tx.userProblem.findMany({ where: { userId: { in: ids } } });
    const byProblem = new Map();
    for (const r of ups) { if (!byProblem.has(r.problemId)) byProblem.set(r.problemId, []); byProblem.get(r.problemId).push(r); }
    const conflicted = [...byProblem.entries()].filter(([, rows]) => rows.length > 1).map(([pid]) => pid);
    const history = new Map();
    if (isMastered && conflicted.length) {
      const atts = await tx.attempt.findMany({
        where: { userId: keep.id, problemId: { in: conflicted } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { problemId: true, isCorrect: true },
      });
      for (const a of atts) { if (!history.has(a.problemId)) history.set(a.problemId, []); history.get(a.problemId).push(a.isCorrect); }
    }
    await tx.userProblem.deleteMany({ where: { userId: { in: dupeIds } } });
    let movedUp = 0;
    for (const [problemId, rows] of byProblem) {
      const own = rows.find((r) => r.userId === keep.id);
      const everCorrect = rows.some((r) => r.everCorrect);
      const updatedAt = maxDate(...rows.map((r) => r.updatedAt));
      let mastered = rows.some((r) => r.mastered);
      if (rows.length > 1) {
        stats.userProblemConflicts++;
        const h = history.get(problemId);
        if (isMastered && h && h.length) mastered = isMastered(h);
      }
      if (own) {
        if (rows.length > 1) await tx.userProblem.update({ where: { userId_problemId: { userId: keep.id, problemId } }, data: { everCorrect, mastered, updatedAt } });
      } else {
        movedUp++;
        await tx.userProblem.create({ data: { userId: keep.id, problemId, everCorrect, mastered, updatedAt } });
      }
    }
    stats.moved.UserProblem = movedUp;

    // MathSkillProgress
    const msp = await tx.mathSkillProgress.findMany({ where: { userId: { in: ids } } });
    const bySkill = new Map();
    for (const r of msp) { if (!bySkill.has(r.skillId)) bySkill.set(r.skillId, []); bySkill.get(r.skillId).push(r); }
    await tx.mathSkillProgress.deleteMany({ where: { userId: { in: ids } } });
    let movedMsp = 0;
    for (const [skillId, rows] of bySkill) {
      if (rows.length > 1) stats.mathConflicts++;
      if (!rows.some((r) => r.userId === keep.id)) movedMsp++;
      await tx.mathSkillProgress.create({ data: { userId: keep.id, skillId, ...mergeProgress(rows) } });
    }
    stats.moved.MathSkillProgress = movedMsp;

    const level = Math.max(keep.level, ...dupes.map((u) => u.level));
    if (level !== keep.level) await tx.user.update({ where: { id: keep.id }, data: { level } });
    stats.deleted.mergedUsers = (await tx.user.deleteMany({ where: { id: { in: dupeIds } } })).count;
  }

  if (otherIds.length) {
    const w = { where: { userId: { in: otherIds } } };
    stats.deleted.Attempt = (await tx.attempt.deleteMany(w)).count;
    stats.deleted.Test = (await tx.test.deleteMany(w)).count;
    stats.deleted.SpellingAttempt = (await tx.spellingAttempt.deleteMany(w)).count;
    stats.deleted.MathAttempt = (await tx.mathAttempt.deleteMany(w)).count;
    stats.deleted.MathSkillProgress = (await tx.mathSkillProgress.deleteMany(w)).count;
    stats.deleted.UserProblem = (await tx.userProblem.deleteMany(w)).count;
    stats.deleted.Account = (await tx.account.deleteMany(w)).count;
    stats.deleted.Session = (await tx.session.deleteMany(w)).count;
    stats.deleted.Users = (await tx.user.deleteMany({ where: { id: { in: otherIds } } })).count;
  }

  const real = await tx.user.findMany({ where: { isGuest: false }, select: { id: true, name: true } });
  if (real.length !== 1 || real[0].name !== KEEP) throw new Error(`Expected exactly one non-guest user (${KEEP}), found: ${real.map((u) => u.name).join(', ')}`);
  const braylAttemptsAfter = await tx.attempt.count({ where: { userId: keep.id } });
  const sumBefore = braylAttemptsBefore + (dupeIds.length ? stats.moved.Attempt : 0);
  if (braylAttemptsAfter !== sumBefore) throw new Error(`Attempt count mismatch: ${braylAttemptsAfter} vs ${sumBefore}`);
  log(`moved  : ${JSON.stringify(stats.moved)}`);
  log(`merged : ${stats.userProblemConflicts} UserProblem conflicts, ${stats.mathConflicts} MathSkillProgress conflicts`);
  log(`deleted: ${JSON.stringify(stats.deleted)}`);
  log(`result : ${KEEP} has ${braylAttemptsAfter} attempts; ${real.length} non-guest user remains; guest seat rows untouched`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is not set'); process.exit(2); }
  const host = hostOf(url);
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (!local && !HAS_BACKUP) {
    console.error(`Refusing to run against non-localhost database "${host}" without --i-have-a-backup.`);
    process.exit(2);
  }
  const isMastered = await loadIsMastered();
  console.log(`Target db: ${host}${url.includes('/') ? '/' + url.split('/').pop().split('?')[0] : ''}  mode: ${CONFIRM ? 'CONFIRM (writes)' : 'DRY RUN (rolled back)'}`);
  if (!isMastered) console.log('note: lib/mastery.js not loadable here; merged `mastered` falls back to OR');

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      await run(tx, isMastered, (m) => console.log(m));
      if (!CONFIRM) throw new Rollback();
    }, { timeout: 120000, maxWait: 20000 });
    console.log('Committed.');
  } catch (e) {
    if (e instanceof Rollback) console.log('Dry run: nothing was written. Re-run with --confirm to apply.');
    else { console.error(e.message || e); process.exitCode = 1; }
  } finally {
    await prisma.$disconnect();
  }
}

main();
