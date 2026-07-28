import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig(({ mode }) => {
  // Node context: read all vars (no VITE_ filter) — DEV_PROXY* stay server-side only.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue(), tailwindcss(), ViteImageOptimizer()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server:
      env.DEV_PROXY === 'true'
        ? {
            proxy: {
              '/api': {
                target: env.DEV_PROXY_TARGET ?? 'http://localhost:3000',
                changeOrigin: true,
              },
            },
          }
        : undefined,
  };
});
