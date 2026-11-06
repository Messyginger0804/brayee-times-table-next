import { NextResponse } from 'next/server';
import { guestSafe } from '../../../../lib/guestWrite';
import { getSkillSummary, getLibrarySkill, isProblemSkill, evaluateWindow, WINDOW_DEFAULT, LEVEL_ADVANCE_WINDOW } from '../../../../lib/mathSkills';
import { checkAnswer } from '../../../../lib/curriculum/math/index.js';
import { requireActor } from '../../_utils';

export const dynamic = 'force-dynamic';

const ANSWER_TYPES = ['integer', 'decimal', 'fraction', 'symbol', 'choice', 'quotient_remainder'];
// Minimal problem object for checkAnswer. The client may say which answerType/requireSimplest the generated problem had;
// otherwise it is inferred from the expected answer.
function problemFor(skill, b) {
  const exp = String(b.expected).trim();
  let answerType = ANSWER_TYPES.includes(b.answerType) ? b.answerType : null;
  if (!answerType) {
    if (/ R \d/i.test(exp)) answerType = 'quotient_remainder';
    else if (/^[<>=]$/.test(exp)) answerType = 'symbol';
    else if (/^[a-z]+$/i.test(exp)) answerType = 'choice';
    else if (exp.includes('/') || getLibrarySkill(skill.id)?.answerType === 'fraction') answerType = 'fraction';
    else answerType = 'integer';
  }
  const choices = Array.isArray(b.choices) ? b.choices.filter((c) => typeof c === 'string').slice(0, 6) : [exp];
  return { answer: exp, answerType, requireSimplest: !!b.requireSimplest, keypad: { choices: choices.includes(exp) ? choices : [...choices, exp] } };
}

const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

// POST { skillId, prompt, expected, given, ms, answerType?, requireSimplest?, choices? }
// -> { correct, feedbackHint?, leveledUp, masteredNow, progress: { skillId, levelIndex, levelCount, mastered, attempts, windowSize, windowAccuracy, levelHave, levelNeed } }
// Answers are judged by the library's checkAnswer (equivalent fractions, decimals, remainders). Mastery uses masteryStatus
// (lib/curriculum): a result qualifies if correct AND within secondsPerProblem (`ms`). Levels 1..n-1: the last 10 problems at the
// level meet the skill's accuracyPct -> next level. Last level: the last `window` (20) meet it -> skill mastered.
// Times-table skills backed by Problem rows are rejected: use /api/problems/[id]/attempt for those.
export async function POST(req) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const uid = actor.id;
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const skill = getSkillSummary(b?.skillId);
  if (!skill) return NextResponse.json({ error: 'Unknown skillId' }, { status: 400 });
  if (isProblemSkill(skill.id)) {
    return NextResponse.json({ error: 'This skill is tracked with the times-table problems (/api/problems/[id]/attempt)' }, { status: 400 });
  }
  if (!str(b.prompt, 300) || !str(b.expected, 100) || typeof b.given !== 'string' || b.given.length > 100) {
    return NextResponse.json({ error: 'prompt, expected and given must be strings' }, { status: 400 });
  }
  if (!Number.isFinite(b.ms) || b.ms < 0) return NextResponse.json({ error: 'ms must be a non-negative number' }, { status: 400 });
  const ms = Math.min(Math.round(b.ms), 600000); // cap so one walk-away does not wreck the average
  const check = checkAnswer(problemFor(skill, b), b.given);
  const correct = check.correct;
  const win = skill.mastery.window || WINDOW_DEFAULT;

  const w = await guestSafe(actor, async (tx) => {
    await tx.mathSkillProgress.upsert({
      where: { userId_skillId: { userId: uid, skillId: skill.id } },
      create: { userId: uid, skillId: skill.id }, update: {},
    });
    const [row] = await tx.$queryRaw`SELECT id FROM "MathSkillProgress" WHERE "userId" = ${uid} AND "skillId" = ${skill.id} FOR UPDATE`;
    const p = await tx.mathSkillProgress.findUnique({ where: { id: row.id } });
    const levelIndex = Math.min(p.levelIndex, skill.levelCount - 1);
    const recent = [...(Array.isArray(p.recent) ? p.recent : []), { c: correct, ms }].slice(-win);
    const isLast = levelIndex >= skill.levelCount - 1;
    let next = { levelIndex, recent, attempts: p.attempts + 1, correct: p.correct + (correct ? 1 : 0) };
    let leveledUp = false, masteredNow = false;
    const mastered = p.mastered;
    if (evaluateWindow(recent, skill, isLast).mastered) {
      if (!isLast) { next = { ...next, levelIndex: levelIndex + 1, recent: [] }; leveledUp = true; }
      else if (!mastered) { next.mastered = true; next.masteredAt = new Date(); masteredNow = true; }
    }
    await tx.mathAttempt.create({
      data: { userId: uid, skillId: skill.id, levelIndex, prompt: b.prompt, expected: b.expected, given: b.given, correct, ms },
    });
    const u = await tx.mathSkillProgress.update({ where: { id: p.id }, data: next });
    return { u, leveledUp, masteredNow };
  });
  if (w.lost) return w.lost;
  const result = w.value;

  const r = Array.isArray(result.u.recent) ? result.u.recent : [];
  return NextResponse.json({
    correct,
    ...(check.feedbackHint ? { feedbackHint: check.feedbackHint } : {}),
    leveledUp: result.leveledUp,
    masteredNow: result.masteredNow,
    progress: {
      skillId: skill.id, levelIndex: result.u.levelIndex, levelCount: skill.levelCount, mastered: result.u.mastered,
      attempts: result.u.attempts, windowSize: r.length,
      levelNeed: result.u.levelIndex >= skill.levelCount - 1 ? win : LEVEL_ADVANCE_WINDOW,
      levelHave: Math.min(r.length, result.u.levelIndex >= skill.levelCount - 1 ? win : LEVEL_ADVANCE_WINDOW),
      windowAccuracy: r.length ? Math.round((r.filter((x) => x.c).length / r.length) * 100) : null,
    },
  });
}
