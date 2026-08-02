const REFRESH_TOKEN_KEY = 'template-webapp.refreshToken';

/**
 * Access token lives ONLY in memory — it is short-lived and re-obtainable, so
 * it never touches persistent storage (XSS payloads cannot read a closure).
 * The refresh token is persisted so sessions survive a page reload.
 *
 * NOTE: localStorage is the pragmatic default for a template that must work
 * against a mock API. In production, prefer an httpOnly+Secure cookie set by
 * the backend for the refresh token and delete this persistence.
 */
let accessToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(nextAccessToken: string, nextRefreshToken: string): void {
    accessToken = nextAccessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
  },

  clear(): void {
    accessToken = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
