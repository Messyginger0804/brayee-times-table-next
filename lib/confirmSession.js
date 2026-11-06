// After signIn the home page must find a live session. Poll /api/auth/me until it answers 200 (it can lag a beat
// behind the session cookie on a cold serverless start) before the login page navigates away.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `fetchMe` resolves with an HTTP status number (or rejects on network errors). Returns true once a 200 is seen. */
export async function confirmSession(fetchMe, { tries = 6, delayMs = 300, wait = sleep } = {}) {
  for (let i = 0; i < tries; i++) {
    try { if ((await fetchMe()) === 200) return true; } catch (_) {}
    if (i < tries - 1) await wait(delayMs * (i + 1));
  }
  return false;
}
