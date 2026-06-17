const COOKIE_NAME = "orb_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getOrCreateSessionId(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (match) return decodeURIComponent(match[1]);

  const sessionId = crypto.randomUUID();
  document.cookie = `${COOKIE_NAME}=${sessionId}; path=/; max-age=${ONE_YEAR_SECONDS}`;
  return sessionId;
}
