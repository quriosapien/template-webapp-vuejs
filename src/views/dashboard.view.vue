<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const router = useRouter();

async function onLogout(): Promise<void> {
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <main class="mx-auto mt-16 max-w-xl p-8">
    <h1 class="mb-4 text-2xl font-bold">Dashboard</h1>
    <p class="mb-6 text-slate-600">
      Signed in as <strong>{{ auth.user?.name }}</strong> ({{ auth.user?.email }})
    </p>
    <button
      type="button"
      class="rounded-md bg-slate-800 px-4 py-2 font-semibold text-white"
      @click="onLogout"
    >
      Sign out
    </button>
  </main>
</template>
