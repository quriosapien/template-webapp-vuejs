import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { DEMO_USER } from '@/mocks/handlers';
import { createAppRouter } from '@/router';
import { useAuthStore } from '@/stores/auth.store';

describe('router auth guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('redirects unauthenticated users to the login view with a redirect query', async () => {
    const router = createAppRouter(createMemoryHistory());
    await router.push('/dashboard');

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard');
  });

  it('allows navigation to protected routes when authenticated', async () => {
    const auth = useAuthStore();
    auth.user = DEMO_USER;
    auth.status = 'authenticated';

    const router = createAppRouter(createMemoryHistory());
    await router.push('/dashboard');

    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('leaves public routes unguarded', async () => {
    const router = createAppRouter(createMemoryHistory());
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('home');
  });
});
