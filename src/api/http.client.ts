import { config } from '@/config';
import type { AuthTokens } from '@/types/auth.types';
import { isTokenExpired } from '@/utils/jwt.util';
import { tokenStorage } from '@/utils/token-storage.util';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip the Authorization header AND the 401→refresh→retry flow (login, refresh). */
  skipAuth?: boolean;
};

// Single-flight: concurrent 401s share one refresh request instead of racing.
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken || isTokenExpired(refreshToken)) {
    return false;
  }

  const response = await fetch(`${config.VITE_API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    return false;
  }

  const tokens = (await response.json()) as AuthTokens;
  tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth = false, ...init } = options;

  const execute = async (): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (!skipAuth) {
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }
    return fetch(`${config.VITE_API_BASE_URL}${path}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await execute();

  if (response.status === 401 && !skipAuth) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;

    if (!refreshed) {
      tokenStorage.clear();
      throw new HttpError(401, { message: 'Session expired' });
    }
    response = await execute();
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new HttpError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
