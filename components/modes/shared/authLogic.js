/** Only a definite "no session" / "no such user" answer may clear the session. Network errors, timeouts and 5xx are transient. */
export const shouldSignOut = (status) => status === 401 || status === 403 || status === 404;
