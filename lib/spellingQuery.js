// Query-string parsing / filter building for GET /api/spelling/words (pure, no DB).
const TIERS = ['core', 'hf', 'bee'];

/**
 * @param {URLSearchParams} sp
 * @returns {{ error: string } | { grade: number|null, unit: string|null, tier: string|null }}
 */
export function parseSpellingQuery(sp) {
  const rawGrade = sp.get('grade');
  let grade = null;
  if (rawGrade != null && rawGrade !== '') {
    grade = Number(rawGrade);
    if (!Number.isInteger(grade) || grade < 1 || grade > 6) return { error: 'grade must be 1-6' };
  }
  const unit = sp.get('unit') || null;
  const tier = sp.get('tier') || null;
  if (tier && !TIERS.includes(tier)) return { error: 'tier must be core, hf or bee' };
  if (unit && !/^[a-z0-9]{1,16}$/i.test(unit)) return { error: 'invalid unit' };
  return { grade, unit, tier };
}

export function buildSpellingWhere({ grade, unit, tier }) {
  const where = { active: true };
  if (grade != null) where.grade = grade;
  if (unit) where.unitId = unit;
  if (tier) where.tier = tier;
  return where;
}
