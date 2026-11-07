import { NextResponse } from 'next/server';

export const MAINTENANCE_MESSAGE = 'The game is getting an upgrade! Please try again in a few minutes. 🛠️';

// Tables and columns introduced by the pending migrations (20260401*, 20260501*, 20260601*, 20260701*). Keep in sync when adding a migration
// that the running code depends on. Only errors naming one of these count as "schema not migrated yet".
export const NEW_TABLES = ['MathSkillProgress', 'MathAttempt', 'SkillUnlock'];
export const NEW_QUALIFIED_COLUMNS = [
  'User.grade', 'User.isGuest', 'User.guestSeat', 'User.guestTokenHash', 'User.lastActiveAt', 'User.savedCadet', 'User.savedAt',
  'SpellingWord.grade', 'SpellingWord.unitId', 'SpellingWord.tier', 'SpellingWord.syllables', 'SpellingWord.source',
  'MathSkillProgress.unlockedByParent',
];
// Column names distinctive enough to recognise unqualified (Postgres' raw 'column "isGuest" does not exist').
const DISTINCT_COLUMNS = ['isGuest', 'guestSeat', 'guestTokenHash', 'lastActiveAt', 'savedCadet', 'savedAt', 'unlockedByParent', 'unitId', 'syllables'];

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORD = (list) => new RegExp(`(^|[^A-Za-z0-9_])(${list.map(esc).join('|')})($|[^A-Za-z0-9_])`);
const TABLE_RE = WORD(NEW_TABLES);
const QUALIFIED_RE = WORD(NEW_QUALIFIED_COLUMNS);
const DISTINCT_RE = WORD(DISTINCT_COLUMNS);
// Generic names added by these migrations. Only trusted inside a Postgres raw-query "does not exist" error, never on their own.
const RAW_GENERIC_RE = WORD(['grade', 'tier', 'source']);

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
const PRISMA_CODES = ['P2021', 'P2022', 'P2010'];
const strings = (...xs) => xs.filter((x) => typeof x === 'string');
const errorText = (e) => strings(e.meta?.column, e.meta?.table, e.meta?.modelName, e.meta?.message, e.message).join(' | ');

// P2010 (raw query): must be a Postgres "does not exist" error; generic names (grade, tier, source) count only here.
function rawIdentifier(e, text) {
  if (!/42703|42P01|does not exist/.test(`${e.meta?.code ?? ''} ${text}`)) return null;
  return namedIdentifier(text) || text.match(RAW_GENERIC_RE)?.[2] || null;
}

// P2021/P2022: a named identifier from our migrations matches. Prisma sometimes reports none at all ("(not available)"): the
// target is unknown, so treat it as not migrated. A named, unrelated column or table still rethrows.
function modelIdentifier(e, text) {
  const named = namedIdentifier(text);
  if (named) return named;
  const other = strings(e.meta?.column, e.meta?.table).filter((x) => x.trim() && !/not available/i.test(x));
  return other.length ? null : '(unknown)';
}

export function isSchemaMissing(e) {
  if (!PRISMA_CODES.includes(e?.code)) return false;
  const text = errorText(e);
  const ident = e.code === 'P2010' ? rawIdentifier(e, text) : modelIdentifier(e, text);
  if (!ident) return false;
  console.error(`[schema-not-migrated] ${e.code} ${ident}`);
  return true;
}

/** Friendly 503 for API routes. */
export function maintenanceResponse() {
  return NextResponse.json({ error: MAINTENANCE_MESSAGE, maintenance: true }, { status: 503, headers: { 'Retry-After': '120' } });
}
