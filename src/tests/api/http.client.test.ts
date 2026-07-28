import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { HttpError, httpRequest } from '@/api/http.client';
import { DEMO_USER, makeFakeJwt } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import type { User } from '@/types/auth.types';
import { tokenStorage } from '@/utils/token-storage.util';

describe('httpRequest', () => {
  it('attaches the bearer token to authenticated requests', async () => {
    let seenAuthorization: string | null = null;
    server.use(
      http.get('*/api/echo', ({ request }) => {
        seenAuthorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    tokenStorage.setTokens('my-access-token', 'my-refresh-token');
    await httpRequest<{ ok: boolean }>('/echo');
    expect(seenAuthorization).toBe('Bearer my-access-token');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    // Expired access token + valid refresh token: /auth/me 401s, the client
    // hits /auth/refresh, stores the rotated pair, retries, and succeeds.
    tokenStorage.setTokens(makeFakeJwt(DEMO_USER.id, -60), makeFakeJwt(DEMO_USER.id, 3600));

    const user = await httpRequest<User>('/auth/me');

    expect(user).toEqual(DEMO_USER);
    expect(tokenStorage.getAccessToken()).not.toBe(null);
    expect(tokenStorage.getAccessToken()).not.toContain(makeFakeJwt(DEMO_USER.id, -60));
  });

  it('clears tokens and throws HttpError when refresh fails', async () => {
    tokenStorage.setTokens(makeFakeJwt(DEMO_USER.id, -60), makeFakeJwt(DEMO_USER.id, -60));

    await expect(httpRequest<User>('/auth/me')).rejects.toBeInstanceOf(HttpError);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('throws HttpError with status and body for non-401 failures', async () => {
    server.use(
      http.get('*/api/broken', () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );

    const failure = await httpRequest('/broken').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(500);
    expect((failure as HttpError).body).toEqual({ message: 'boom' });
  });

  it('skipAuth requests never trigger a refresh', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({ message: 'nope' }, { status: 401 });
      }),
      http.get('*/api/public', () =>
        HttpResponse.json({ message: 'unauthorized' }, { status: 401 }),
      ),
    );

    await expect(httpRequest('/public', { skipAuth: true })).rejects.toBeInstanceOf(HttpError);
    expect(refreshCalls).toBe(0);
  });
});
