import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { DEMO_PASSWORD, DEMO_USER } from '@/mocks/handlers';
import { createAppRouter } from '@/router';
import { useAuthStore } from '@/stores/auth.store';
import LoginView from '@/views/login.view.vue';

async function mountLogin() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter(createMemoryHistory());
  await router.push('/login');
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } });
  return { wrapper, router };
}

describe('LoginView', () => {
  // Each test gets a fresh pinia + router via mountLogin.

  it('logs in with valid credentials and navigates to the dashboard', async () => {
    const { wrapper, router } = await mountLogin();

    await wrapper.find('input[type="email"]').setValue(DEMO_USER.email);
    await wrapper.find('input[type="password"]').setValue(DEMO_PASSWORD);
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(useAuthStore().status).toBe('authenticated');
    // The dashboard route's lazy component must load before router.push()
    // settles; that load goes through Vite's on-demand transform, which can
    // take more than one microtask flush — poll instead of a single flush.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('dashboard'));
  });

  it('shows the store error for invalid credentials', async () => {
    const { wrapper, router } = await mountLogin();

    await wrapper.find('input[type="password"]').setValue('wrong-password');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Invalid email or password');
    expect(useAuthStore().status).toBe('unauthenticated');
    expect(router.currentRoute.value.name).toBe('login');
  });
});
