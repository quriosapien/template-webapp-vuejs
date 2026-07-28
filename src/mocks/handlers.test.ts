import { describe, expect, it } from 'vitest';
import { decodeJwtPayload } from '@/utils/jwt.util';
import { DEMO_PASSWORD, DEMO_USER, makeFakeJwt } from './handlers';
import { server } from './server';

const API = 'http://localhost/api';

describe('auth mock handlers', () => {
  it('login returns user + token pair for valid credentials', async () => {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_USER.email, password: DEMO_PASSWORD }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toEqual(DEMO_USER);
    expect(decodeJwtPayload(body.accessToken)?.sub).toBe(DEMO_USER.id);
    expect(decodeJwtPayload(body.refreshToken)?.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('login rejects bad credentials with 401', async () => {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_USER.email, password: 'wrong' }),
    });
    expect(response.status).toBe(401);
  });

  it('refresh rotates the token pair for a valid refresh token', async () => {
    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: makeFakeJwt(DEMO_USER.id, 3600) }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('refresh rejects an expired refresh token with 401', async () => {
    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: makeFakeJwt(DEMO_USER.id, -60) }),
    });
    expect(response.status).toBe(401);
  });

  it('me returns the user for a valid bearer token and 401 otherwise', async () => {
    const ok = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${makeFakeJwt(DEMO_USER.id, 3600)}` },
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual(DEMO_USER);

    const unauthorized = await fetch(`${API}/auth/me`);
    expect(unauthorized.status).toBe(401);
  });

  it('server is importable (lifecycle handled by test setup)', () => {
    expect(server).toBeDefined();
  });
});
