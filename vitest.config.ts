import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // Node's fetch (used by Vitest even under jsdom) rejects relative URLs, so
    // tests need an absolute API base. MSW handlers use `*/api/...` wildcards
    // so they match both this absolute base and the browser's relative `/api`.
    env: {
      VITE_API_BASE_URL: 'http://localhost/api',
    },
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.types.ts',
        'src/**/*.d.ts',
        'src/mocks/**',
        'src/test/**',
      ],
    },
  },
});
