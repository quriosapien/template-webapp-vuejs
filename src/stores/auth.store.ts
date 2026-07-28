import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { HttpError } from '@/api/http.client';
import type { User } from '@/types/auth.types';
import { tokenStorage } from '@/utils/token-storage.util';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const status = ref<AuthStatus>('idle');
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => status.value === 'authenticated');

  async function login(email: string, password: string): Promise<void> {
    status.value = 'loading';
    error.value = null;
    try {
      const response = await authApi.login({ email, password });
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      user.value = response.user;
      status.value = 'authenticated';
    } catch (caught) {
      user.value = null;
      status.value = 'unauthenticated';
      error.value =
        caught instanceof HttpError && caught.status === 401
          ? 'Invalid email or password'
          : 'Login failed. Please try again.';
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Best effort — the client-side session is cleared regardless.
    }
    tokenStorage.clear();
    user.value = null;
    status.value = 'unauthenticated';
    error.value = null;
  }

  /** Restore a session after a page reload using the persisted refresh token. */
  async function bootstrap(): Promise<void> {
    if (!tokenStorage.getRefreshToken()) {
      status.value = 'unauthenticated';
      return;
    }
    status.value = 'loading';
    try {
      // me() 401s on the stale access token; the HTTP client refreshes and retries.
      user.value = await authApi.me();
      status.value = 'authenticated';
    } catch {
      tokenStorage.clear();
      user.value = null;
      status.value = 'unauthenticated';
    }
  }

  return { user, status, error, isAuthenticated, login, logout, bootstrap };
});
