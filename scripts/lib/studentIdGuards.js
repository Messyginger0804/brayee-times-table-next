// Pure guards for scripts/set-student-id.js (no DB, no I/O) so they can be unit tested.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];
const STUDENT_ID_RE = /^\d{5,8}$/; // same rule as lib/cadetNames.js

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^\[|\]$/g, ''); } catch (_) { return null; }
}

/** True only for a parseable URL on a loopback host with no host/hostaddr override in the query string. */
function isLocalDbUrl(url) {
  const host = hostOf(url);
  if (!LOCAL_HOSTS.includes(host)) return false;
  const params = new URL(url).searchParams;
  return !params.has('host') && !params.has('hostaddr');
}

const isValidStudentId = (id) => typeof id === 'string' && STUDENT_ID_RE.test(id);

module.exports = { hostOf, isLocalDbUrl, isValidStudentId };
