import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/mocks/server';
import { tokenStorage } from '@/utils/token-storage.util';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  tokenStorage.clear();
  localStorage.clear();
});

afterAll(() => server.close());
