import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_PASSWORD, DEMO_USER, makeFakeJwt } from '@/mocks/handlers';
import { useAuthStore } from '@/stores/auth.store';
import { tokenStorage } from '@/utils/token-storage.util';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('login stores the user and tokens on success', async () => {
    const auth = useAuthStore();
    await auth.login(DEMO_USER.email, DEMO_PASSWORD);

    expect(auth.status).toBe('authenticated');
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user).toEqual(DEMO_USER);
    expect(auth.error).toBeNull();
    expect(tokenStorage.getAccessToken()).not.toBeNull();
    expect(tokenStorage.getRefreshToken()).not.toBeNull();
  });

  it('login surfaces a friendly error for invalid credentials', async () => {
    const auth = useAuthStore();
    await auth.login(DEMO_USER.email, 'wrong-password');

    expect(auth.status).toBe('unauthenticated');
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.error).toBe('Invalid email or password');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('logout clears the session even if the API call fails', async () => {
    const auth = useAuthStore();
    await auth.login(DEMO_USER.email, DEMO_PASSWORD);
    await auth.logout();

    expect(auth.status).toBe('unauthenticated');
    expect(auth.user).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('bootstrap restores the session from a stored refresh token', async () => {
    tokenStorage.setTokens(makeFakeJwt(DEMO_USER.id, -60), makeFakeJwt(DEMO_USER.id, 3600));

    const auth = useAuthStore();
    await auth.bootstrap();

    expect(auth.status).toBe('authenticated');
    expect(auth.user).toEqual(DEMO_USER);
  });

  it('bootstrap resolves to unauthenticated when no refresh token exists', async () => {
    const auth = useAuthStore();
    await auth.bootstrap();
    expect(auth.status).toBe('unauthenticated');
  });
});
