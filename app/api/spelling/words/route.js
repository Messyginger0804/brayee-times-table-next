import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import fallbackWords from '../../../../lib/spellingWords.json';
import { getUserId } from '../../_utils';

export const dynamic = 'force-dynamic';

const SELECT = {
  id: true, word: true, partOfSpeech: true, definition: true, sentence: true, difficulty: true, category: true,
  grade: true, unitId: true, tier: true, syllables: true,
};

// Active SpellingWord rows. Optional ?grade=1-6 &unit=g3u6 &tier=core|hf|bee.
// With no ?grade the signed-in kid's own grade is used; with no grade set (or not signed in) this is the old
// behaviour: every active word. Falls back to lib/spellingWords.json when the table is empty (or unreachable).
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  let grade = null;
  if (sp.get('grade') != null && sp.get('grade') !== '') {
    grade = Number(sp.get('grade'));
    if (!Number.isInteger(grade) || grade < 1 || grade > 6) return NextResponse.json({ error: 'grade must be 1-6' }, { status: 400 });
  }
  const unit = sp.get('unit') || null;
  const tier = sp.get('tier') || null;
  if (tier && !['core', 'hf', 'bee'].includes(tier)) return NextResponse.json({ error: 'tier must be core, hf or bee' }, { status: 400 });
  if (unit && !/^[a-z0-9]{1,16}$/i.test(unit)) return NextResponse.json({ error: 'invalid unit' }, { status: 400 });

  try {
    let explicit = grade != null;
    if (grade == null) {
      const uid = await getUserId();
      if (uid) {
        const u = await prisma.user.findUnique({ where: { id: uid }, select: { grade: true } });
        grade = u?.grade ?? null;
      }
    }
    const where = { active: true };
    if (grade != null) where.grade = grade;
    if (unit) where.unitId = unit;
    if (tier) where.tier = tier;
    const rows = await prisma.spellingWord.findMany({ where, orderBy: { id: 'asc' }, select: SELECT });
    if (rows.length > 0 || explicit || unit || tier) return NextResponse.json({ source: 'db', grade, words: rows });
    // kid's default grade has no rows yet (e.g. words not imported): old behaviour
    const all = await prisma.spellingWord.findMany({ where: { active: true }, orderBy: { id: 'asc' }, select: SELECT });
    if (all.length > 0) return NextResponse.json({ source: 'db', grade: null, words: all });
  } catch (_) {
    // fall through to the bundled list
  }
  return NextResponse.json({ source: 'fallback', grade: null, words: fallbackWords });
}
