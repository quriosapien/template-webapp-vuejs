import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from '@/app.vue';
import { config } from '@/config';
import { createAppRouter } from '@/router';
import '@/styles/index.css';

/**
 * Dev-only API mocking. `import.meta.env.DEV` is replaced at build time, so
 * production bundles drop this branch — and the dynamic import — entirely.
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || !config.VITE_USE_MSW) {
    return;
  }
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  const app = createApp(App);
  app.use(createPinia()); // before the router: the auth guard reads the store
  app.use(createAppRouter());
  app.mount('#app');
});
