import { HttpResponse, http } from 'msw';
import type { LoginRequest, LoginResponse, User } from '@/types/auth.types';
import { isTokenExpired } from '@/utils/jwt.util';

export const DEMO_USER: User = { id: 'u_1', email: 'demo@example.com', name: 'Demo User' };
export const DEMO_PASSWORD = 'password123';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const encodeSegment = (value: object): string =>
  btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

/**
 * Issues an UNSIGNED JWT-shaped token with a real exp claim, so client-side
 * expiry logic behaves exactly as with real tokens. Never use outside mocks.
 */
export function makeFakeJwt(subject: string, expiresInSeconds: number): string {
  const header = encodeSegment({ alg: 'none', typ: 'JWT' });
  const payload = encodeSegment({
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  return `${header}.${payload}.mock-signature`;
}

function issueTokenPair(): { accessToken: string; refreshToken: string } {
  return {
    accessToken: makeFakeJwt(DEMO_USER.id, ACCESS_TOKEN_TTL_SECONDS),
    refreshToken: makeFakeJwt(DEMO_USER.id, REFRESH_TOKEN_TTL_SECONDS),
  };
}

// Paths use a leading wildcard so they match the browser's same-origin `/api/...`
// AND the absolute `http://localhost/api/...` base used in unit tests.
export const handlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    if (body.email !== DEMO_USER.email || body.password !== DEMO_PASSWORD) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
    const response: LoginResponse = { user: DEMO_USER, ...issueTokenPair() };
    return HttpResponse.json(response);
  }),

  http.post('*/api/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    if (!body.refreshToken || isTokenExpired(body.refreshToken, 0)) {
      return HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
    }
    // Token rotation: every refresh returns a brand-new pair.
    return HttpResponse.json(issueTokenPair());
  }),

  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.get('*/api/auth/me', ({ request }) => {
    const bearer = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!bearer || isTokenExpired(bearer, 0)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json(DEMO_USER);
  }),
];
