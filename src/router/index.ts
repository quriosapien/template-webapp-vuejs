import { createRouter, createWebHistory, type Router, type RouterHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
  }
}

/**
 * Factory instead of a singleton so tests can inject a memory history.
 * The app (main.ts) calls it with the default web history.
 */
export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: () => import('@/views/home.view.vue') },
      { path: '/login', name: 'login', component: () => import('@/views/login.view.vue') },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard.view.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/not-found.view.vue'),
      },
    ],
  });

  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth) {
      return true;
    }

    const auth = useAuthStore();
    // Lazy session bootstrap: first guarded navigation after a reload tries
    // to restore the session from the persisted refresh token.
    if (auth.status === 'idle') {
      await auth.bootstrap();
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    return true;
  });

  return router;
}
