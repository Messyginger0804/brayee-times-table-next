// One-shot hand-off from /login to the home screen: the login hook queues a welcome, the home screen takes it
// (read + delete), so the cadet popup shows once per claim/resume and never on a plain page load.
const CADET_WELCOME_KEY = 'cadetWelcome';

const WELCOME_KINDS = ['claim', 'resume'];

export function queueCadetWelcome(storage, { label, kind }) {
  if (!label || !WELCOME_KINDS.includes(kind)) return;
  try { storage.setItem(CADET_WELCOME_KEY, JSON.stringify({ label: String(label), kind })); } catch (_) {}
}

export function takeCadetWelcome(storage) {
  try {
    const raw = storage.getItem(CADET_WELCOME_KEY);
    if (!raw) return null;
    storage.removeItem(CADET_WELCOME_KEY);
    const v = JSON.parse(raw);
    return v?.label && WELCOME_KINDS.includes(v.kind) ? { label: v.label, kind: v.kind } : null;
  } catch (_) {
    return null;
  }
}

export function cadetWelcomeTitle({ label, kind }) {
  return kind === 'resume' ? `Welcome back, Cadet ${label}! 🚀` : `🚀 Welcome aboard, Cadet ${label}!`;
}
