// Validation for the "Save my cadet" form: the nickname (shown to the kid, never private) and the 5-digit student ID.
// Pure functions, no I/O, so the route and the tests share them. The student ID must never be logged or echoed by callers.

const NAME_MIN = 2;
export const NAME_MAX = 16;
const SECRET_LENGTH = 5;

const NAME_CHARS = /^[A-Za-z0-9][A-Za-z0-9 '-]*$/;

// Words that are never fine in a kid's nickname, even inside a longer word. Checked on the letters-only, de-leeted form.
const BLOCKED_ANYWHERE = [
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'pussy', 'penis', 'vagina', 'dildo', 'porn', 'nigg', 'retard', 'nazi', 'hitler',
  'bastard', 'rapist', 'molest',
];
// Short words that are rude on their own but appear inside harmless names (Cassie, Dickson, Peacock): only matched as whole words.
const BLOCKED_WHOLE = ['ass', 'arse', 'damn', 'hell', 'crap', 'sex', 'sexy', 'dick', 'cock', 'tit', 'tits', 'boob', 'boobs', 'butt', 'poop', 'rape', 'kill', 'fag', 'wtf'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' };
const deleet = (s) => s.replace(/[0134578]/g, (c) => LEET[c] ?? c);

/** Trim, collapse runs of spaces, and turn typographic apostrophes (iPad keyboards) into '. */
export function normalizeName(raw) {
  return String(raw ?? '').replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim();
}

const squish = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Names the game uses itself: Braylee's account, guest seats ("Guest 003") and the "Cadet 003" label. */
export function isReservedName(name) {
  const s = squish(name);
  return s.startsWith('braylee') || s.startsWith('guest') || s.startsWith('cadet');
}

/** True when the nickname holds a word we do not allow. */
export function isProfane(name) {
  const lower = name.toLowerCase();
  const words = lower.split(/[ '-]+/).filter(Boolean).map((w) => deleet(w).replace(/[^a-z]/g, ''));
  if (words.some((w) => BLOCKED_WHOLE.includes(w))) return true;
  const joined = deleet(lower).replace(/[^a-z]/g, '');
  return BLOCKED_ANYWHERE.some((b) => joined.includes(b));
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
  const a = String(secret ?? '');
  if (!/^\d{5}$/.test(a)) return { ok: false, error: `Your student ID needs exactly ${SECRET_LENGTH} numbers.` };
  if (a !== String(confirm ?? '')) return { ok: false, error: 'The two student IDs do not match. Try again!' };
  return { ok: true };
}
