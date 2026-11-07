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
 * SkillUnlock        : the dupes' unlocks are added to KEEP's (union, never lost); other users' rows are deleted.
 *
 * Usage:  node scripts/cleanup-accounts.js                # dry run (default): does everything, then rolls back
 *         node scripts/cleanup-accounts.js --confirm      # writes (ONE transaction)
 *         add --i-have-a-backup to run against a non-localhost DATABASE_URL
 * Idempotent: a second --confirm finds nothing left to merge or delete.
 */
const { PrismaClient } = require('@prisma/client');
const { groupBy, mergeProgress, mergeUserProblemRows } = require('./lib/accountMerge');

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

const MOVED_MODELS = [['Attempt', 'attempt'], ['Test', 'test'], ['SpellingAttempt', 'spellingAttempt'], ['MathAttempt', 'mathAttempt']];

async function loadPlan(tx) {
  const keep = await tx.user.findUnique({ where: { name: KEEP } });
  if (!keep) throw new Error(`No user named exactly "${KEEP}" - refusing to continue`);
  const dupes = await tx.user.findMany({ where: { name: { in: MERGE }, isGuest: false }, orderBy: { id: 'asc' } });
  const others = await tx.user.findMany({
    where: { isGuest: false, name: { notIn: [KEEP, ...MERGE] } },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
  return { keep, dupes, dupeIds: dupes.map((u) => u.id), others, otherIds: others.map((u) => u.id) };
}

function logPlan(plan, attemptsBefore, log) {
  const { keep, dupes, others } = plan;
  log(`keep   : ${KEEP} (id ${keep.id}), ${attemptsBefore} attempts`);
  log(`merge  : ${dupes.length ? dupes.map((u) => `${u.name}(id ${u.id})`).join(', ') : '(none left)'}  [looked for ${MERGE.join(', ')}]`);
  log(`delete : ${others.length} users${others.length ? ': ' + others.map((u) => u.name).join(', ') : ''}`);
}

async function moveAttemptRows(tx, plan, stats) {
  for (const [label, model] of MOVED_MODELS) {
    const r = await tx[model].updateMany({ where: { userId: { in: plan.dupeIds } }, data: { userId: plan.keep.id } });
    stats.moved[label] = r.count;
  }
}

// problemId -> isCorrect[] (newest first) for the problems that exist on more than one account
async function loadAttemptHistory(tx, keepId, conflicted, isMastered) {
  if (!isMastered || !conflicted.length) return new Map();
  const atts = await tx.attempt.findMany({
    where: { userId: keepId, problemId: { in: conflicted } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { problemId: true, isCorrect: true },
  });
  const grouped = groupBy(atts, (a) => a.problemId);
  return new Map([...grouped].map(([pid, rows]) => [pid, rows.map((a) => a.isCorrect)]));
}

async function mergeUserProblems(tx, plan, ids, isMastered, stats) {
  const keepId = plan.keep.id;
  const ups = await tx.userProblem.findMany({ where: { userId: { in: ids } } });
  const byProblem = groupBy(ups, (r) => r.problemId);
  const conflicted = [...byProblem.entries()].filter(([, rows]) => rows.length > 1).map(([pid]) => pid);
  const history = await loadAttemptHistory(tx, keepId, conflicted, isMastered);
  await tx.userProblem.deleteMany({ where: { userId: { in: plan.dupeIds } } });
  let movedUp = 0;
  for (const [problemId, rows] of byProblem) {
    const { own, conflict, data } = mergeUserProblemRows(rows, keepId, history.get(problemId), isMastered);
    if (conflict) stats.userProblemConflicts++;
    if (!own) {
      movedUp++;
      await tx.userProblem.create({ data: { userId: keepId, problemId, ...data } });
    } else if (conflict) {
      await tx.userProblem.update({ where: { userId_problemId: { userId: keepId, problemId } }, data });
    }
  }
  stats.moved.UserProblem = movedUp;
}

async function mergeSkillProgress(tx, plan, ids, stats) {
  const keepId = plan.keep.id;
  const msp = await tx.mathSkillProgress.findMany({ where: { userId: { in: ids } } });
  const bySkill = groupBy(msp, (r) => r.skillId);
  await tx.mathSkillProgress.deleteMany({ where: { userId: { in: ids } } });
  let movedMsp = 0;
  for (const [skillId, rows] of bySkill) {
    if (rows.length > 1) stats.mathConflicts++;
    if (!rows.some((r) => r.userId === keepId)) movedMsp++;
    await tx.mathSkillProgress.create({ data: { userId: keepId, skillId, ...mergeProgress(rows) } });
  }
  stats.moved.MathSkillProgress = movedMsp;
}

async function mergeUnlocks(tx, plan, stats) {
  const rows = await tx.skillUnlock.findMany({ where: { userId: { in: plan.dupeIds } } });
  const data = [...new Map(rows.map((r) => [r.skillId, { userId: plan.keep.id, skillId: r.skillId, unlockedAt: r.unlockedAt }])).values()];
  stats.moved.SkillUnlock = data.length ? (await tx.skillUnlock.createMany({ data, skipDuplicates: true })).count : 0;
}

async function mergeDupes(tx, plan, isMastered, stats) {
  const { keep, dupes, dupeIds } = plan;
  const ids = [keep.id, ...dupeIds];
  await moveAttemptRows(tx, plan, stats);
  await mergeUserProblems(tx, plan, ids, isMastered, stats);
  await mergeSkillProgress(tx, plan, ids, stats);
  await mergeUnlocks(tx, plan, stats);
  const level = Math.max(keep.level, ...dupes.map((u) => u.level));
  if (level !== keep.level) await tx.user.update({ where: { id: keep.id }, data: { level } });
  stats.deleted.mergedUsers = (await tx.user.deleteMany({ where: { id: { in: dupeIds } } })).count;
}

async function deleteOthers(tx, otherIds, stats) {
  const w = { where: { userId: { in: otherIds } } };
  stats.deleted.Attempt = (await tx.attempt.deleteMany(w)).count;
  stats.deleted.Test = (await tx.test.deleteMany(w)).count;
  stats.deleted.SpellingAttempt = (await tx.spellingAttempt.deleteMany(w)).count;
  stats.deleted.MathAttempt = (await tx.mathAttempt.deleteMany(w)).count;
  stats.deleted.MathSkillProgress = (await tx.mathSkillProgress.deleteMany(w)).count;
  stats.deleted.UserProblem = (await tx.userProblem.deleteMany(w)).count;
  stats.deleted.SkillUnlock = (await tx.skillUnlock.deleteMany(w)).count;
  stats.deleted.Account = (await tx.account.deleteMany(w)).count;
  stats.deleted.Session = (await tx.session.deleteMany(w)).count;
  stats.deleted.Users = (await tx.user.deleteMany({ where: { id: { in: otherIds } } })).count;
}

async function verifyAndReport(tx, plan, attemptsBefore, stats, log) {
  const { keep, dupeIds } = plan;
  const real = await tx.user.findMany({ where: { isGuest: false }, select: { id: true, name: true } });
  if (real.length !== 1 || real[0].name !== KEEP) throw new Error(`Expected exactly one non-guest user (${KEEP}), found: ${real.map((u) => u.name).join(', ')}`);
  const attemptsAfter = await tx.attempt.count({ where: { userId: keep.id } });
  const sumBefore = attemptsBefore + (dupeIds.length ? stats.moved.Attempt : 0);
  if (attemptsAfter !== sumBefore) throw new Error(`Attempt count mismatch: ${attemptsAfter} vs ${sumBefore}`);
  log(`moved  : ${JSON.stringify(stats.moved)}`);
  log(`merged : ${stats.userProblemConflicts} UserProblem conflicts, ${stats.mathConflicts} MathSkillProgress conflicts`);
  log(`deleted: ${JSON.stringify(stats.deleted)}`);
  log(`result : ${KEEP} has ${attemptsAfter} attempts; ${real.length} non-guest user remains; guest seat rows untouched`);
}

async function run(tx, isMastered, log) {
  const plan = await loadPlan(tx);
  const attemptsBefore = await tx.attempt.count({ where: { userId: plan.keep.id } });
  logPlan(plan, attemptsBefore, log);

  const stats = { moved: {}, userProblemConflicts: 0, mathConflicts: 0, deleted: {} };
  if (plan.dupeIds.length) await mergeDupes(tx, plan, isMastered, stats);
  if (plan.otherIds.length) await deleteOthers(tx, plan.otherIds, stats);
  await verifyAndReport(tx, plan, attemptsBefore, stats, log);
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
