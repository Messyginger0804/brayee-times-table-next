// Pure key-state rules for the on-screen keypad (mirrored by keypadCanType in tests/curriculum/helpers.js).
// Each rule returns the text to append for the special key `k` given the current `value`, or null if not allowed.

const endsInDigit = (v) => /\d$/.test(v);

const decimalToken = (value) => {
  const part = value.split(/[ /R]/).pop();
  if (part.includes('.')) return null;
  return part === '' ? '0.' : '.';
};

const SPECIAL_RULES = {
  '-': (v) => (v === '' ? '-' : null),
  '.': decimalToken,
  '/': (v) => (endsInDigit(v) && !v.includes('/') ? '/' : null),
  ' ': (v) => (endsInDigit(v) && !v.includes('/') && !v.includes(' ') ? ' ' : null),
  R: (v) => (endsInDigit(v) && !v.includes('R') ? ' R ' : null),
};

export function specialToken(k, value) {
  const rule = Object.hasOwn(SPECIAL_RULES, k) ? SPECIAL_RULES[k] : null;
  return rule ? rule(value) : null;
}

/** Physical-keyboard keys that map to a special key when `extras` is set (r/R both mean remainder). */
export function physicalSpecialKey(key) {
  if (key === 'r' || key === 'R') return 'R';
  return Object.hasOwn(SPECIAL_RULES, key) ? key : null;
}
