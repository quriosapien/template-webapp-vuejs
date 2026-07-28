import { beforeEach, describe, expect, it } from 'vitest';
import { tokenStorage } from '@/utils/token-storage.util';

describe('tokenStorage', () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it('starts empty', () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('stores and returns both tokens', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    expect(tokenStorage.getAccessToken()).toBe('access-1');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-1');
  });

  it('persists only the refresh token to localStorage', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    const stored = Object.values({ ...localStorage });
    expect(stored).toContain('refresh-1');
    expect(stored).not.toContain('access-1');
  });

  it('clear removes everything', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
