// Validation for the "Save my cadet" form: the nickname (shown to the kid, never private) and the student ID (exactly 6 digits, 0-9 only).
// Pure functions, no I/O, so the route and the tests share them. The student ID must never be logged or echoed by callers.

const NAME_MIN = 2;
export const NAME_MAX = 16;
// The one place that says what a student ID looks like; the forms, the save route and sign-in all use these.
export const STUDENT_ID_LENGTH = 6;
export const STUDENT_ID_PATTERN = `\\d{${STUDENT_ID_LENGTH}}`; // for the HTML pattern attribute
// ASCII digits only (\d without the u flag), anchored: no trimming, no unicode digits, no trailing newline.
const STUDENT_ID_RE = new RegExp(`^${STUDENT_ID_PATTERN}$`);
export const STUDENT_ID_ERROR = `Your student ID is ${STUDENT_ID_LENGTH} numbers.`;
export const isValidStudentId = (id) => typeof id === 'string' && STUDENT_ID_RE.test(id);

const NAME_CHARS = /^[A-Za-z0-9][A-Za-z0-9 '-]*$/;

// Words that are never fine in a kid's nickname, even inside a longer word. Checked on the letters-only, de-leeted form, and again with
// repeated letters collapsed ("fuuuck" -> "fuck") for the entries that stay long enough to be distinctive.
const BLOCKED_ANYWHERE = [
  'fuck', 'phuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'pussy', 'penis', 'vagina', 'dildo', 'porn', 'nigg', 'retard', 'nazi', 'hitler',
  'bastard', 'rapist', 'molest',
];
// Short words that are rude on their own but appear inside harmless names (Cassie, Dickson, Peacock): only matched as whole words.
const BLOCKED_WHOLE = ['ass', 'arse', 'damn', 'hell', 'crap', 'sex', 'sexy', 'dick', 'cock', 'tit', 'tits', 'boob', 'boobs', 'butt', 'poop', 'rape', 'kill', 'fag', 'wtf', 'fuk', 'fck'];
// Words that make a compound rude when glued to a name part ("Dumbass", "Asshat", "Dickhead", "Butthead", "Poophead", "Sexyboy"),
// unless the word is a normal one (class, grass, assemble, Dickson, butter, Essex ...).
const AFFIXES = ['ass', 'butt', 'dick', 'poop', 'sex'];
const AFFIX_OK_WORDS = ['class', 'pass', 'bass', 'grass', 'glass', 'mass', 'brass', 'sass', 'lass', 'crass', 'harass', 'compass', 'trespass', 'essex', 'middlesex'];
const AFFIX_OK_PREFIXES = ['assem', 'assi', 'assu', 'assa', 'asse', 'asso', 'dickson', 'dickens', 'butter', 'button', 'buttress', 'sexton', 'sextet', 'sextant'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' };
const deleet = (s) => s.replace(/[0134578]/g, (c) => LEET[c] ?? c);
const collapse = (s) => s.replace(/(.)\1+/g, '$1');

/** Trim, collapse runs of spaces, and turn typographic apostrophes (iPad keyboards) into '. */
export function normalizeName(raw) {
  return String(raw ?? '').replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim();
}

const squish = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Names the game uses itself: Braylee's account, guest seats ("Guest 003") and the "Cadet 003" label. */
export function isReservedName(name) {
  const s = squish(name);
  // "Bray" is exact only (scripts/cleanup-accounts.js merges it into Braylee); a prefix rule would block "Brayden"
  return s === 'bray' || s.startsWith('braylee') || s.startsWith('guest') || s.startsWith('cadet');
}

const compoundRude = (w) => !AFFIX_OK_WORDS.includes(w) && !AFFIX_OK_PREFIXES.some((ok) => w.startsWith(ok)) && AFFIXES.some((a) => w.length > a.length && (w.startsWith(a) || w.endsWith(a)));

/** True when the nickname holds a word we do not allow (case, spacing, leetspeak and stretched letters do not hide it). */
export function isProfane(name) {
  const lower = name.toLowerCase();
  const words = lower.split(/[ '-]+/).filter(Boolean).map((w) => deleet(w).replace(/[^a-z]/g, ''));
  if (words.some((w) => BLOCKED_WHOLE.includes(w) || BLOCKED_WHOLE.includes(collapse(w)) || compoundRude(w))) return true;
  const joined = deleet(lower).replace(/[^a-z]/g, '');
  if (BLOCKED_ANYWHERE.some((b) => joined.includes(b))) return true;
  const squeezed = collapse(joined);
  return BLOCKED_ANYWHERE.map(collapse).filter((b) => b.length >= 4).some((b) => squeezed.includes(b));
}

/** Returns { ok: true, name } (normalized) or { ok: false, error } with a message a child can read. */
export function validateNickname(raw) {
  const name = normalizeName(raw);
  if (name.length < NAME_MIN || name.length > NAME_MAX) return { ok: false, error: `Pick a name with ${NAME_MIN} to ${NAME_MAX} letters or numbers.` };
  if (!NAME_CHARS.test(name)) return { ok: false, error: "Names can use letters, numbers, spaces, ' and - only." };
  if (isReservedName(name)) return { ok: false, error: 'That name is saved for the game. Pick another one!' };
  if (isProfane(name)) return { ok: false, error: 'Let\'s pick a different name, Cadet!' };
  return { ok: true, name };
}

/** Two entries of the student ID. Returns { ok: true } or { ok: false, error }. */
export function validateSecret(secret, confirm) {
  if (!isValidStudentId(secret)) return { ok: false, error: STUDENT_ID_ERROR };
  if (secret !== confirm) return { ok: false, error: 'The two student IDs do not match. Try again!' };
  return { ok: true };
}
