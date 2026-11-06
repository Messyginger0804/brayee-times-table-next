import { NextResponse } from 'next/server';

export const MAINTENANCE_MESSAGE = 'The game is getting an upgrade! Please try again in a few minutes. 🛠️';

// Tables and columns introduced by the pending migrations (20260401*, 20260501*, 20260601*). Keep in sync when adding a migration
// that the running code depends on. Only errors naming one of these count as "schema not migrated yet".
export const NEW_TABLES = ['MathSkillProgress', 'MathAttempt'];
export const NEW_QUALIFIED_COLUMNS = [
  'User.grade', 'User.isGuest', 'User.guestSeat', 'User.guestTokenHash', 'User.lastActiveAt',
  'SpellingWord.grade', 'SpellingWord.unitId', 'SpellingWord.tier', 'SpellingWord.syllables', 'SpellingWord.source',
  'MathSkillProgress.unlockedByParent',
];
// Column names distinctive enough to recognise unqualified (Postgres' raw 'column "isGuest" does not exist').
const DISTINCT_COLUMNS = ['isGuest', 'guestSeat', 'guestTokenHash', 'lastActiveAt', 'unlockedByParent', 'unitId', 'syllables'];

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORD = (list) => new RegExp(`(^|[^A-Za-z0-9_])(${list.map(esc).join('|')})($|[^A-Za-z0-9_])`);
const TABLE_RE = WORD(NEW_TABLES);
const QUALIFIED_RE = WORD(NEW_QUALIFIED_COLUMNS);
const DISTINCT_RE = WORD(DISTINCT_COLUMNS);

/** Which new table/column does this text name? Returns the identifier or null. */
function namedIdentifier(text) {
  return (text.match(QUALIFIED_RE) || text.match(DISTINCT_RE) || text.match(TABLE_RE))?.[2] ?? null;
}

/**
 * True only when the database is missing a table/column that this PR's migrations add, i.e. the code was deployed before
 * `prisma migrate deploy` ran. P2021/P2022 must name one of the identifiers above (via meta or message); P2010 (raw query)
 * must be a Postgres "does not exist" error (42703 / 42P01) naming one. Everything else is NOT matched, so it rethrows and
 * shows up as a real 500. The original error is logged server-side as code + identifier only (no message, so no user data).
 */
export function isSchemaMissing(e) {
  const code = e?.code;
  if (code !== 'P2021' && code !== 'P2022' && code !== 'P2010') return false;
  const text = [e?.meta?.column, e?.meta?.table, e?.meta?.modelName, e?.meta?.message, e?.message].filter((x) => typeof x === 'string').join(' | ');
  if (code === 'P2010' && !/42703|42P01|does not exist/.test(`${e?.meta?.code ?? ''} ${text}`)) return false;
  const ident = namedIdentifier(text);
  if (!ident) return false;
  console.error(`[schema-not-migrated] ${code} ${ident}`);
  return true;
}

/** Friendly 503 for API routes. */
export function maintenanceResponse() {
  return NextResponse.json({ error: MAINTENANCE_MESSAGE, maintenance: true }, { status: 503, headers: { 'Retry-After': '120' } });
}
