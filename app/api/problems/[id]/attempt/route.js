import { NextResponse } from 'next/server';
import { guestSafe } from '../../../../../lib/guestWrite';
import { requireProblemRequest } from '../../../_utils';
import { MASTERY_STREAK, isMastered } from '../../../../../lib/mastery';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const { userId, actor, problemId, error } = await requireProblemRequest(params);
  if (error) return error;
  const { correct } = await req.json().catch(() => ({}));
  if (typeof correct !== 'boolean') return NextResponse.json({ error: 'Missing boolean `correct`' }, { status: 400 });
  try {
    const w = await guestSafe(actor, async (tx) => {
      await tx.attempt.create({ data: { problemId, userId, isCorrect: !!correct } });
      const toDelete = await tx.attempt.findMany({
        where: { problemId, userId },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        select: { id: true },
      });
      if (toDelete.length) {
        await tx.attempt.deleteMany({ where: { id: { in: toDelete.map(a => a.id) } } });
      }
      await tx.problem.update({
        where: { id: problemId },
        data: correct ? { correct: { increment: 1 } } : { incorrect: { increment: 1 } },
      });
      // Mastery: see lib/mastery.js (3 correct in a row => mastered; a miss clears it)
      const recent = await tx.attempt.findMany({
        where: { problemId, userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: MASTERY_STREAK,
        select: { isCorrect: true },
      });
      const mastered = isMastered(recent.map(a => a.isCorrect));
      if (correct) {
        await tx.userProblem.upsert({
          where: { userId_problemId: { userId, problemId } },
          update: { everCorrect: true, mastered },
          create: { userId, problemId, everCorrect: true, mastered },
        });
      } else {
        await tx.userProblem.updateMany({ where: { userId, problemId }, data: { mastered: false } });
      }
    });
    if (w.lost) return w.lost;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 });
  }
}

