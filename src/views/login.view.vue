<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

// Literal (not imported from @/mocks) so production bundles never pull in MSW.
const DEMO_EMAIL = 'demo@example.com';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref(DEMO_EMAIL);
const password = ref('');

async function onSubmit(): Promise<void> {
  await auth.login(email.value, password.value);
  if (auth.isAuthenticated) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    await router.push(redirect);
  }
}
</script>

<template>
  <main class="mx-auto mt-16 max-w-sm rounded-xl border border-slate-200 p-8 shadow-sm">
    <h1 class="mb-6 text-2xl font-bold">Sign in</h1>
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          v-model="email"
          type="email"
          class="rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          v-model="password"
          type="password"
          class="rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>
      <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>
      <button
        type="submit"
        :disabled="auth.status === 'loading'"
        class="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {{ auth.status === 'loading' ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
    <p class="mt-4 text-xs text-slate-500">
      Demo credentials: {{ DEMO_EMAIL }} / password123 (served by MSW in dev)
    </p>
  </main>
</template>
