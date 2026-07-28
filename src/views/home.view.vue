<script setup lang="ts">
import { RouterLink } from 'vue-router';
import logoUrl from '@/assets/logo.svg';
import { config } from '@/config';
</script>

<template>
  <main class="mx-auto mt-16 max-w-xl p-8 text-center">
    <img :src="logoUrl" alt="Logo" class="mx-auto mb-6 h-16 w-16" />
    <h1 class="mb-2 text-3xl font-bold">{{ config.VITE_APP_NAME }}</h1>
    <p class="mb-8 text-slate-600">
      Vue 3 + TS + Vite template with JWT auth, routing, and state management.
    </p>
    <RouterLink to="/dashboard" class="font-semibold text-emerald-600 underline">
      Go to dashboard (protected)
    </RouterLink>
  </main>
</template>
