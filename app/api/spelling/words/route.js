import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import fallbackWords from '../../../../lib/spellingWords.json';
import { getUserId } from '../../_utils';
import { parseSpellingQuery, buildSpellingWhere } from '../../../../lib/spellingQuery';

export const dynamic = 'force-dynamic';

const SELECT = {
  id: true, word: true, partOfSpeech: true, definition: true, sentence: true, difficulty: true, category: true,
  grade: true, unitId: true, tier: true, syllables: true,
};

// Active SpellingWord rows. Optional ?grade=1-6 &unit=g3u6 &tier=core|hf|bee.
// With no ?grade the signed-in kid's own grade is used; with no grade set (or not signed in) this is the old
// behaviour: every active word. Falls back to lib/spellingWords.json when the table is empty (or unreachable).
async function signedInGrade() {
  const uid = await getUserId();
  if (!uid) return null;
  const u = await prisma.user.findUnique({ where: { id: uid }, select: { grade: true } });
  return u?.grade ?? null;
}

async function findWords(where) {
  return prisma.spellingWord.findMany({ where, orderBy: { id: 'asc' }, select: SELECT });
}

export async function GET(req) {
  const q = parseSpellingQuery(new URL(req.url).searchParams);
  if (q.error) return NextResponse.json({ error: q.error }, { status: 400 });
  const { unit, tier } = q;
  let { grade } = q;

  try {
    const explicit = grade != null;
    if (!explicit) grade = await signedInGrade();
    const rows = await findWords(buildSpellingWhere({ grade, unit, tier }));
    if (rows.length > 0 || explicit || unit || tier) return NextResponse.json({ source: 'db', grade, words: rows });
    // kid's default grade has no rows yet (e.g. words not imported): old behaviour
    const all = await findWords({ active: true });
    if (all.length > 0) return NextResponse.json({ source: 'db', grade: null, words: all });
  } catch (_) {
    // fall through to the bundled list
  }
  return NextResponse.json({ source: 'fallback', grade: null, words: fallbackWords });
}
