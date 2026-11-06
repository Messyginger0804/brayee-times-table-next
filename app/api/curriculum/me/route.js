import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { buildSkillStates } from '../../../../lib/skillState';
import { requireUserId } from '../../_utils';

export const dynamic = 'force-dynamic';

// GET /api/curriculum/me[?grade=1-6|all]
// -> { grade, shownGrade, skills: [{ id, grade, order, name, levelCount, levelNames, levelIndex, mastery, source, unlocked, mastered, progress }] }
// Defaults to the kid's own grade; a kid with no grade set sees all grades. Unlock rule: first skill of a grade, or the
// previous skill (by order, same grade) is mastered, or the skill already has attempts.
// Skills come from lib/curriculum (getSkills).
export async function GET(req) {
  const uid = await requireUserId();
  if (uid instanceof NextResponse) return uid;
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, grade: true } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const q = new URL(req.url).searchParams.get('grade');
  let shown = user.grade;
  if (q === 'all') shown = null;
  else if (q != null && q !== '') {
    const g = Number(q);
    if (!Number.isInteger(g) || g < 1 || g > 6) return NextResponse.json({ error: 'grade must be 1-6 or all' }, { status: 400 });
    shown = g;
  }

  const skills = await buildSkillStates(uid, shown);
  return NextResponse.json({ grade: user.grade, shownGrade: shown, skills });
}
