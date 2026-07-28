# template-webapp-vue-ts7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A production-grade Vue 3 + TypeScript webapp template with Vite 7, Vue Router 4, Pinia, JWT auth with refresh-token rotation, MSW-mocked API (with a ready dev-proxy switch), Tailwind CSS v4, and Vitest unit tests — mirroring the conventions of `template-webserver-ts7` and the sibling `template-webapp-react-ts7`.

**Architecture:** Role-grouped `src/` layout with kebab-case role-suffixed files (`*.view.vue`, `*.store.ts`, `*.api.ts`, `*.util.ts`, `*.types.ts`, `*.test.ts`), all imports via the `@/` alias. Env is read ONLY in `src/config/env.ts` (Vite-native `.env` loading + Zod validation → frozen typed `config`). Auth: access token in memory, refresh token in `localStorage`, a fetch-based HTTP client that single-flight-refreshes on 401 and retries once. A `router.beforeEach` guard protects routes flagged `meta.requiresAuth` and lazily bootstraps the session. MSW fakes the auth API in dev and in tests; a Vite dev proxy can replace it with one env flip.

**Tech Stack:** Node 26 (ESM only), TypeScript 7 (vue-tsc for typecheck — tsgo cannot parse `.vue` SFCs), Vite 7, Vue 3, Vue Router 4, Pinia 3, Zod 4, Tailwind CSS v4 (`@tailwindcss/vite`), MSW 2, Vitest 4 + @vue/test-utils + jsdom, Biome 2, lefthook.

## Global Constraints

- **Node.js >= 26**: `.nvmrc` contains `26`; `package.json` has `"engines": { "node": ">=26" }`.
- **ESM strictly**: `"type": "module"` in package.json; no `require`.
- **TypeScript 7**: devDep `typescript@^7`; `typecheck` script is `vue-tsc --noEmit`. Contingency: if the installed vue-tsc refuses to run against typescript@7, pin `typescript` to the latest 5.x in this template only and note it in the README — vue-tsc is non-negotiable because it is the only checker that understands SFC templates.
- **No dotenv package**: Vite loads `.env` / `.env.<mode>` natively. Nothing outside `src/config/env.ts` reads `import.meta.env`.
- **No axios**: native `fetch` only.
- **Biome only** for lint + format (no ESLint, no Prettier). Config copied from template-webserver-ts7. Biome's `.vue` support covers `<script>` blocks (template linting is not Biome's job); vue-tsc covers template type errors.
- **File naming**: kebab-case with role suffixes: `*.view.vue`, `*.component.vue`, `*.store.ts`, `*.api.ts`, `*.client.ts`, `*.util.ts`, `*.types.ts`, `*.constant.ts`, `*.test.ts`.
- **Imports**: always the `@/` alias for `src/` (never long relative paths).
- **Tests**: colocated next to the unit under test.
- **Token policy**: access token in memory only; refresh token in `localStorage` with a code comment noting production should prefer httpOnly cookies.
- **`public/`** = served verbatim; **`src/assets/`** = processed by Vite (hashed + optimized).
- Commit after every task. Working directory for all commands is the template root (the folder containing this PLAN.md).

---

### Task 1: Project scaffold — toolchain, configs, and a booting app shell

**Files:**
- Create: `.nvmrc`, `.gitignore`, `package.json`, `tsconfig.json`, `biome.json`, `lefthook.yml`, `vite.config.ts`, `index.html`, `.env.example`, `.env.local`, `.vscode/settings.json`, `.vscode/extensions.json`, `src/main.ts`, `src/app.vue`, `src/styles/index.css`, `src/types/vite-env.d.ts`, `public/robots.txt`, `src/assets/logo.svg`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a building/running Vite app; `@/` alias; npm scripts `dev|build|preview|typecheck|lint|lint:fix|lint:ci|format|test|test:watch|prepare` that every later task relies on.

- [ ] **Step 1: Init git and Node version pin**

```bash
git init
printf '26\n' > .nvmrc
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Test/coverage output
coverage/

# Logs
logs/
*.log
npm-debug.log*

# Environment files — keep only .env.example committed
.env
.env.local
.env.development
.env.test
.env.staging
.env.production

# Editor / OS
.DS_Store
*.swp
.idea/
```

- [ ] **Step 3: Write base `package.json`** (deps are installed in Step 8 so npm resolves current versions)

```json
{
  "name": "template-webapp-vue-ts7",
  "version": "0.1.0",
  "description": "Production-grade Vue 3 + TypeScript webapp template (Vite, Vue Router, Pinia, JWT auth, MSW).",
  "type": "module",
  "private": true,
  "engines": {
    "node": ">=26"
  },
  "scripts": {
    "dev": "vite",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "lint:ci": "biome ci .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepare": "lefthook install"
  }
}
```

- [ ] **Step 4: Write `tsconfig.json`** (backend template's strict flags + DOM + Vue JSX preserve)

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client", "node"],
    "strict": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "vite.config.ts", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Write `biome.json`** (verbatim from template-webserver-ts7 — org-wide style)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "includes": ["**", "!**/dist", "!**/node_modules", "!**/coverage", "!**/public/mockServiceWorker.js"]
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended",
      "style": {
        "noNonNullAssertion": "off",
        "useImportType": "error"
      },
      "suspicious": {
        "noConsole": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  }
}
```

Note: if the installed Biome major rejects `"preset": "recommended"`, use `"recommended": true` instead — keep whatever the backend template's installed Biome accepts.

- [ ] **Step 6: Write `lefthook.yml`** (backend's, with `vue` and `css` added to the glob)

```yaml
# Git hooks managed by lefthook (Go binary — fast, no Node startup cost).
# Installed automatically via the "prepare" npm script on `npm install`.
pre-commit:
  parallel: true
  commands:
    biome:
      glob: '*.{js,ts,jsx,tsx,json,jsonc,vue,css}'
      run: npx biome check --write --no-errors-on-unmatched {staged_files}
      stage_fixed: true
```

- [ ] **Step 7: Write `.vscode/settings.json` and `.vscode/extensions.json`**

`.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[vue]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

`.vscode/extensions.json` (Volar is required for SFC IntelliSense):

```json
{
  "recommendations": ["biomejs.biome", "Vue.volar"]
}
```

- [ ] **Step 8: Install dependencies** (unpinned so npm resolves latest; verify majors after)

```bash
npm install vue vue-router pinia zod
npm install -D typescript vue-tsc @types/node \
  vite @vitejs/plugin-vue tailwindcss @tailwindcss/vite \
  vite-plugin-image-optimizer sharp svgo \
  vitest jsdom @vue/test-utils msw \
  @biomejs/biome lefthook
```

Expected majors (sanity-check `package.json` after install): vue 3, vue-router 4, pinia 3, zod 4, typescript 7 (see Global Constraints contingency), vue-tsc ≥3, vite ≥7, vitest ≥4, msw 2, tailwindcss 4, @biomejs/biome 2. If any engine warnings mention Node 26, they are safe to ignore.

- [ ] **Step 9: Write `vite.config.ts`** (Tailwind, image optimizer, `@/` alias, opt-in dev proxy)

```ts
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
```

- [ ] **Step 10: Write env files**

`.env.example` (the only committed env file):

```bash
# Client-side (exposed to the browser — never put secrets in VITE_* vars)
VITE_APP_NAME=template-webapp-vue-ts7
VITE_API_BASE_URL=/api
VITE_USE_MSW=true

# Dev-server-only (read by vite.config.ts in Node; NOT exposed to the browser)
# Flip DEV_PROXY=true and VITE_USE_MSW=false to hit a real backend instead of MSW.
DEV_PROXY=false
DEV_PROXY_TARGET=http://localhost:3000
```

```bash
cp .env.example .env.local
```

- [ ] **Step 11: Write the app shell**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>template-webapp-vue-ts7</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/styles/index.css`:

```css
@import 'tailwindcss';
```

`src/types/vite-env.d.ts` (typed `import.meta.env`; optional strings because Zod validates in Task 2):

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MSW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`src/app.vue` (root component — only the router outlet; each view owns its layout):

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <RouterView />
</template>
```

`src/main.ts` (placeholder — replaced in Task 9; no router/pinia yet):

```ts
import { createApp } from 'vue';
import App from '@/app.vue';
import '@/styles/index.css';

createApp(App).mount('#app');
```

Note: until Task 8 adds the router, `app.vue` importing `RouterView` would fail at runtime — for this scaffold task only, use this temporary `src/app.vue` instead, then restore the RouterView version in Task 8:

```vue
<template>
  <h1 class="p-8 text-2xl font-bold">template-webapp-vue-ts7</h1>
</template>
```

`public/robots.txt` (proves the served-verbatim folder):

```
User-agent: *
Allow: /
```

`src/assets/logo.svg` (proves the processed-assets pipeline; used by the Home view in Task 8):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <circle cx="32" cy="32" r="28" fill="#42b883" />
  <text x="32" y="41" font-size="26" text-anchor="middle" fill="#ffffff" font-family="sans-serif">V</text>
</svg>
```

- [ ] **Step 12: Verify the scaffold**

```bash
npm run typecheck
npm run lint:fix
npm run build
```

Expected: all succeed; `dist/` contains `index.html` and hashed assets. Then verify the built app serves:

```bash
npm run preview -- --port 4174 &
PREVIEW_PID=$!
sleep 2
curl -s http://localhost:4174/ | grep -q '<div id="app">' && echo PREVIEW_OK
kill $PREVIEW_PID
```

Expected: `PREVIEW_OK`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Vue 3 + TS template (Biome, lefthook, Tailwind v4)"
```

---

### Task 2: Zod-validated env config

**Files:**
- Create: `src/config/env.ts`, `src/config/index.ts`, `vitest.config.ts`, `src/config/env.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseEnv(raw: Record<string, unknown>): Config` (exported for tests) and `config: Config` — frozen object with `VITE_APP_NAME: string`, `VITE_API_BASE_URL: string`, `VITE_USE_MSW: boolean`. Every later task imports `config` from `@/config` and NEVER touches `import.meta.env`.

- [ ] **Step 1: Write `vitest.config.ts`** (needed to run any test; MSW setup file is added in Task 5)

```ts
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.test.*', 'src/**/*.types.ts', 'src/**/*.d.ts', 'src/mocks/**', 'src/test/**'],
    },
  },
});
```

- [ ] **Step 2: Write the failing test** — `src/config/env.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applies defaults when optional vars are missing', () => {
    const config = parseEnv({});
    expect(config.VITE_APP_NAME).toBe('template-webapp-vue-ts7');
    expect(config.VITE_API_BASE_URL).toBe('/api');
    expect(config.VITE_USE_MSW).toBe(false);
  });

  it('coerces boolean strings', () => {
    const config = parseEnv({ VITE_USE_MSW: 'true' });
    expect(config.VITE_USE_MSW).toBe(true);
  });

  it('rejects invalid values with a readable error', () => {
    expect(() => parseEnv({ VITE_USE_MSW: 'yes' })).toThrow(/VITE_USE_MSW/);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnv({}))).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/config/env.test.ts`
Expected: FAIL — cannot resolve `./env`.

- [ ] **Step 4: Write `src/config/env.ts`**

```ts
import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

/**
 * Single source of truth for every environment variable the app consumes.
 * Vite loads `.env` / `.env.<mode>` natively (no dotenv) and exposes VITE_*
 * vars on import.meta.env; this module is the ONLY place that reads them.
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('template-webapp-vue-ts7'),
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_USE_MSW: booleanString.default(false),
});

/** Exported for unit tests; app code uses the `config` singleton below. */
export function parseEnv(raw: Record<string, unknown>) {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    // Fail fast with a readable report instead of crashing deep inside the app.
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return Object.freeze(parsed.data);
}

/** Validated, typed, immutable configuration. The only place env is read. */
export const config = parseEnv(import.meta.env);

export type Config = typeof config;
```

`src/config/index.ts`:

```ts
export { config, parseEnv, type Config } from './env';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/config/env.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Verify and commit**

```bash
npm run typecheck && npm run lint:fix && npm test
git add -A
git commit -m "feat: add Zod-validated typed env config (Vite-native loading)"
```

---

### Task 3: JWT utility (decode + expiry check)

**Files:**
- Create: `src/utils/jwt.util.ts`, `src/utils/jwt.util.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `decodeJwtPayload(token: string): JwtPayload | null` and `isTokenExpired(token: string, skewSeconds?: number): boolean` (default skew 30s). `JwtPayload` = `{ sub?: string; exp?: number; [claim: string]: unknown }`. Used by the HTTP client (Task 6) and MSW handlers (Task 5).

- [ ] **Step 1: Write the failing test** — `src/utils/jwt.util.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, isTokenExpired } from './jwt.util';

/** Builds an unsigned JWT-shaped token, mirroring what the MSW handlers issue. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.mock-signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('decodeJwtPayload', () => {
  it('decodes the payload segment', () => {
    const token = makeToken({ sub: 'u_1', exp: 1234 });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'u_1', exp: 1234 });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('is false for a token expiring well in the future', () => {
    expect(isTokenExpired(makeToken({ exp: nowSeconds() + 3600 }))).toBe(false);
  });

  it('is true for an expired token', () => {
    expect(isTokenExpired(makeToken({ exp: nowSeconds() - 60 }))).toBe(true);
  });

  it('treats tokens inside the clock-skew window as expired', () => {
    expect(isTokenExpired(makeToken({ exp: nowSeconds() + 10 }), 30)).toBe(true);
  });

  it('treats tokens without exp as expired', () => {
    expect(isTokenExpired(makeToken({ sub: 'u_1' }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/jwt.util.test.ts`
Expected: FAIL — cannot resolve `./jwt.util`.

- [ ] **Step 3: Write `src/utils/jwt.util.ts`**

```ts
export interface JwtPayload {
  sub?: string;
  exp?: number;
  [claim: string]: unknown;
}

/**
 * Decodes a JWT payload WITHOUT verifying the signature — signature
 * verification belongs to the server. The client only needs claims (exp)
 * to decide when to refresh proactively.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split('.');
  const payloadSegment = segments[1];
  if (segments.length !== 3 || payloadSegment === undefined) {
    return null;
  }

  try {
    const base64 = payloadSegment.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/** A token without a readable exp claim is treated as expired (fail closed). */
export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  return payload.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/jwt.util.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint:fix
git add -A
git commit -m "feat: add JWT decode and expiry utilities"
```

---

### Task 4: Token storage (in-memory access token, persisted refresh token)

**Files:**
- Create: `src/utils/token-storage.util.ts`, `src/utils/token-storage.util.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `tokenStorage` object: `getAccessToken(): string | null`, `getRefreshToken(): string | null`, `setTokens(accessToken: string, refreshToken: string): void`, `clear(): void`. Used by the HTTP client (Task 6) and auth store (Task 7).

- [ ] **Step 1: Write the failing test** — `src/utils/token-storage.util.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { tokenStorage } from './token-storage.util';

describe('tokenStorage', () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it('starts empty', () => {
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('stores and returns both tokens', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    expect(tokenStorage.getAccessToken()).toBe('access-1');
    expect(tokenStorage.getRefreshToken()).toBe('refresh-1');
  });

  it('persists only the refresh token to localStorage', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    const stored = Object.values({ ...localStorage });
    expect(stored).toContain('refresh-1');
    expect(stored).not.toContain('access-1');
  });

  it('clear removes everything', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/token-storage.util.test.ts`
Expected: FAIL — cannot resolve `./token-storage.util`.

- [ ] **Step 3: Write `src/utils/token-storage.util.ts`**

```ts
const REFRESH_TOKEN_KEY = 'template-webapp-vue-ts7.refreshToken';

/**
 * Access token lives ONLY in memory — it is short-lived and re-obtainable, so
 * it never touches persistent storage (XSS payloads cannot read a closure).
 * The refresh token is persisted so sessions survive a page reload.
 *
 * NOTE: localStorage is the pragmatic default for a template that must work
 * against a mock API. In production, prefer an httpOnly+Secure cookie set by
 * the backend for the refresh token and delete this persistence.
 */
let accessToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(nextAccessToken: string, nextRefreshToken: string): void {
    accessToken = nextAccessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
  },

  clear(): void {
    accessToken = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/token-storage.util.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint:fix
git add -A
git commit -m "feat: add token storage (in-memory access, persisted refresh)"
```

---

### Task 5: Auth types + MSW mock API (handlers, node server, browser worker, test wiring)

**Files:**
- Create: `src/types/auth.types.ts`, `src/mocks/handlers.ts`, `src/mocks/handlers.test.ts`, `src/mocks/server.ts`, `src/mocks/browser.ts`, `src/test/setup.ts`, `public/mockServiceWorker.js` (generated)
- Modify: `vitest.config.ts` (add `setupFiles`), `package.json` (msw worker directory, added by the msw CLI)

**Interfaces:**
- Consumes: `isTokenExpired` from Task 3.
- Produces:
  - Types: `User { id: string; email: string; name: string }`, `LoginRequest { email: string; password: string }`, `AuthTokens { accessToken: string; refreshToken: string }`, `LoginResponse = AuthTokens & { user: User }`.
  - `makeFakeJwt(subject: string, expiresInSeconds: number): string` and constants `DEMO_USER: User`, `DEMO_PASSWORD = 'password123'` from `@/mocks/handlers`.
  - `server` (msw/node `SetupServer`) from `@/mocks/server`; `worker` from `@/mocks/browser`.
  - Mocked endpoints (all under `*/api`): `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
  - Test setup: MSW server lifecycle + storage cleanup runs around every test from now on.

- [ ] **Step 1: Write `src/types/auth.types.ts`**

```ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type LoginResponse = AuthTokens & { user: User };
```

- [ ] **Step 2: Write the failing test** — `src/mocks/handlers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEMO_PASSWORD, DEMO_USER, makeFakeJwt } from './handlers';
import { server } from './server';
import { decodeJwtPayload } from '@/utils/jwt.util';

const API = 'http://localhost/api';

describe('auth mock handlers', () => {
  it('login returns user + token pair for valid credentials', async () => {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_USER.email, password: DEMO_PASSWORD }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toEqual(DEMO_USER);
    expect(decodeJwtPayload(body.accessToken)?.sub).toBe(DEMO_USER.id);
    expect(decodeJwtPayload(body.refreshToken)?.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('login rejects bad credentials with 401', async () => {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_USER.email, password: 'wrong' }),
    });
    expect(response.status).toBe(401);
  });

  it('refresh rotates the token pair for a valid refresh token', async () => {
    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: makeFakeJwt(DEMO_USER.id, 3600) }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('refresh rejects an expired refresh token with 401', async () => {
    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: makeFakeJwt(DEMO_USER.id, -60) }),
    });
    expect(response.status).toBe(401);
  });

  it('me returns the user for a valid bearer token and 401 otherwise', async () => {
    const ok = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${makeFakeJwt(DEMO_USER.id, 3600)}` },
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual(DEMO_USER);

    const unauthorized = await fetch(`${API}/auth/me`);
    expect(unauthorized.status).toBe(401);
  });

  it('server is importable (lifecycle handled by test setup)', () => {
    expect(server).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/mocks/handlers.test.ts`
Expected: FAIL — cannot resolve `./handlers`.

- [ ] **Step 4: Write `src/mocks/handlers.ts`**

```ts
import { HttpResponse, http } from 'msw';
import { isTokenExpired } from '@/utils/jwt.util';
import type { LoginRequest, LoginResponse, User } from '@/types/auth.types';

export const DEMO_USER: User = { id: 'u_1', email: 'demo@example.com', name: 'Demo User' };
export const DEMO_PASSWORD = 'password123';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const encodeSegment = (value: object): string =>
  btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

/**
 * Issues an UNSIGNED JWT-shaped token with a real exp claim, so client-side
 * expiry logic behaves exactly as with real tokens. Never use outside mocks.
 */
export function makeFakeJwt(subject: string, expiresInSeconds: number): string {
  const header = encodeSegment({ alg: 'none', typ: 'JWT' });
  const payload = encodeSegment({
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  return `${header}.${payload}.mock-signature`;
}

function issueTokenPair(): { accessToken: string; refreshToken: string } {
  return {
    accessToken: makeFakeJwt(DEMO_USER.id, ACCESS_TOKEN_TTL_SECONDS),
    refreshToken: makeFakeJwt(DEMO_USER.id, REFRESH_TOKEN_TTL_SECONDS),
  };
}

// Paths use a leading wildcard so they match the browser's same-origin `/api/...`
// AND the absolute `http://localhost/api/...` base used in unit tests.
export const handlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    if (body.email !== DEMO_USER.email || body.password !== DEMO_PASSWORD) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }
    const response: LoginResponse = { user: DEMO_USER, ...issueTokenPair() };
    return HttpResponse.json(response);
  }),

  http.post('*/api/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    if (!body.refreshToken || isTokenExpired(body.refreshToken, 0)) {
      return HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
    }
    // Token rotation: every refresh returns a brand-new pair.
    return HttpResponse.json(issueTokenPair());
  }),

  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })),

  http.get('*/api/auth/me', ({ request }) => {
    const bearer = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!bearer || isTokenExpired(bearer, 0)) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json(DEMO_USER);
  }),
];
```

- [ ] **Step 5: Write `src/mocks/server.ts` and `src/mocks/browser.ts`**

`src/mocks/server.ts` (Node — used by Vitest):

```ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

`src/mocks/browser.ts` (browser — used by `main.ts` in dev):

```ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

- [ ] **Step 6: Write `src/test/setup.ts` and register it**

```ts
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
```

In `vitest.config.ts`, add to the `test` object:

```ts
    setupFiles: ['src/test/setup.ts'],
```

- [ ] **Step 7: Generate the browser service worker**

```bash
npx msw init public/ --save
```

Expected: creates `public/mockServiceWorker.js` and adds `"msw": { "workerDirectory": ["public"] }` to package.json. Commit the worker file — the template must work out of the box.

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/mocks/handlers.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
npm run typecheck && npm run lint:fix && npm test
git add -A
git commit -m "feat: add auth types and MSW mock auth API (login/refresh/logout/me)"
```

---

### Task 6: HTTP client with single-flight refresh + typed auth API

**Files:**
- Create: `src/api/http.client.ts`, `src/api/auth.api.ts`, `src/api/http.client.test.ts`

**Interfaces:**
- Consumes: `config` (Task 2), `tokenStorage` (Task 4), `isTokenExpired` (Task 3), MSW test wiring (Task 5).
- Produces:
  - `class HttpError extends Error { readonly status: number; readonly body: unknown }`
  - `httpRequest<T>(path: string, options?: RequestOptions): Promise<T>` where `RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; skipAuth?: boolean }`
  - `authApi = { login(credentials: LoginRequest): Promise<LoginResponse>, logout(): Promise<void>, me(): Promise<User> }`
  - Used by the auth store (Task 7).

- [ ] **Step 1: Write the failing test** — `src/api/http.client.test.ts`

```ts
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { HttpError, httpRequest } from './http.client';
import { DEMO_USER, makeFakeJwt } from '@/mocks/handlers';
import { server } from '@/mocks/server';
import { tokenStorage } from '@/utils/token-storage.util';
import type { User } from '@/types/auth.types';

describe('httpRequest', () => {
  it('attaches the bearer token to authenticated requests', async () => {
    let seenAuthorization: string | null = null;
    server.use(
      http.get('*/api/echo', ({ request }) => {
        seenAuthorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    tokenStorage.setTokens('my-access-token', 'my-refresh-token');
    await httpRequest<{ ok: boolean }>('/echo');
    expect(seenAuthorization).toBe('Bearer my-access-token');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    // Expired access token + valid refresh token: /auth/me 401s, the client
    // hits /auth/refresh, stores the rotated pair, retries, and succeeds.
    tokenStorage.setTokens(makeFakeJwt(DEMO_USER.id, -60), makeFakeJwt(DEMO_USER.id, 3600));

    const user = await httpRequest<User>('/auth/me');

    expect(user).toEqual(DEMO_USER);
    expect(tokenStorage.getAccessToken()).not.toBe(null);
    expect(tokenStorage.getAccessToken()).not.toContain(makeFakeJwt(DEMO_USER.id, -60));
  });

  it('clears tokens and throws HttpError when refresh fails', async () => {
    tokenStorage.setTokens(makeFakeJwt(DEMO_USER.id, -60), makeFakeJwt(DEMO_USER.id, -60));

    await expect(httpRequest<User>('/auth/me')).rejects.toBeInstanceOf(HttpError);
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('throws HttpError with status and body for non-401 failures', async () => {
    server.use(http.get('*/api/broken', () => HttpResponse.json({ message: 'boom' }, { status: 500 })));

    const failure = await httpRequest('/broken').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(500);
    expect((failure as HttpError).body).toEqual({ message: 'boom' });
  });

  it('skipAuth requests never trigger a refresh', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({ message: 'nope' }, { status: 401 });
      }),
      http.get('*/api/public', () => HttpResponse.json({ message: 'unauthorized' }, { status: 401 })),
    );

    await expect(httpRequest('/public', { skipAuth: true })).rejects.toBeInstanceOf(HttpError);
    expect(refreshCalls).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/http.client.test.ts`
Expected: FAIL — cannot resolve `./http.client`.

- [ ] **Step 3: Write `src/api/http.client.ts`**

```ts
import { config } from '@/config';
import { isTokenExpired } from '@/utils/jwt.util';
import { tokenStorage } from '@/utils/token-storage.util';
import type { AuthTokens } from '@/types/auth.types';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip the Authorization header AND the 401→refresh→retry flow (login, refresh). */
  skipAuth?: boolean;
};

// Single-flight: concurrent 401s share one refresh request instead of racing.
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken || isTokenExpired(refreshToken)) {
    return false;
  }

  const response = await fetch(`${config.VITE_API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    return false;
  }

  const tokens = (await response.json()) as AuthTokens;
  tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
  return true;
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth = false, ...init } = options;

  const execute = async (): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (!skipAuth) {
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }
    return fetch(`${config.VITE_API_BASE_URL}${path}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await execute();

  if (response.status === 401 && !skipAuth) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;

    if (!refreshed) {
      tokenStorage.clear();
      throw new HttpError(401, { message: 'Session expired' });
    }
    response = await execute();
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new HttpError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
```

- [ ] **Step 4: Write `src/api/auth.api.ts`**

```ts
import { httpRequest } from './http.client';
import type { LoginRequest, LoginResponse, User } from '@/types/auth.types';

export const authApi = {
  /** skipAuth: a login must never trigger the refresh flow. */
  login: (credentials: LoginRequest) =>
    httpRequest<LoginResponse>('/auth/login', { method: 'POST', body: credentials, skipAuth: true }),

  logout: () => httpRequest<void>('/auth/logout', { method: 'POST' }),

  /** Session bootstrap rides on the client's 401→refresh→retry: calling me()
   *  with only a stored refresh token transparently re-authenticates. */
  me: () => httpRequest<User>('/auth/me'),
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/api/http.client.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
npm run typecheck && npm run lint:fix && npm test
git add -A
git commit -m "feat: add fetch HTTP client with single-flight token refresh + auth API"
```

---

### Task 7: Auth store (Pinia)

**Files:**
- Create: `src/stores/auth.store.ts`, `src/stores/auth.store.test.ts`

**Interfaces:**
- Consumes: `authApi`, `HttpError` (Task 6), `tokenStorage` (Task 4), `makeFakeJwt`/`DEMO_*` (Task 5, tests only).
- Produces: `useAuthStore` (Pinia setup store, id `'auth'`). State refs: `user: User | null`, `status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'`, `error: string | null`; computed `isAuthenticated: boolean`. Actions: `login(email: string, password: string): Promise<void>`, `logout(): Promise<void>`, `bootstrap(): Promise<void>`. Used by views and the router guard (Task 8) — note the guard calls `useAuthStore()` outside a component, which works because Pinia is installed on the app before the router (Task 9).

- [ ] **Step 1: Write the failing test** — `src/stores/auth.store.test.ts`

```ts
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';
import { DEMO_PASSWORD, DEMO_USER, makeFakeJwt } from '@/mocks/handlers';
import { tokenStorage } from '@/utils/token-storage.util';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('login stores the user and tokens on success', async () => {
    const auth = useAuthStore();
    await auth.login(DEMO_USER.email, DEMO_PASSWORD);

    expect(auth.status).toBe('authenticated');
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user).toEqual(DEMO_USER);
    expect(auth.error).toBeNull();
    expect(tokenStorage.getAccessToken()).not.toBeNull();
    expect(tokenStorage.getRefreshToken()).not.toBeNull();
  });

  it('login surfaces a friendly error for invalid credentials', async () => {
    const auth = useAuthStore();
    await auth.login(DEMO_USER.email, 'wrong-password');

    expect(auth.status).toBe('unauthenticated');
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.error).toBe('Invalid email or password');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('logout clears the session even if the API call fails', async () => {
    const auth = useAuthStore();
    await auth.login(DEMO_USER.email, DEMO_PASSWORD);
    await auth.logout();

    expect(auth.status).toBe('unauthenticated');
    expect(auth.user).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('bootstrap restores the session from a stored refresh token', async () => {
    tokenStorage.setTokens(makeFakeJwt(DEMO_USER.id, -60), makeFakeJwt(DEMO_USER.id, 3600));

    const auth = useAuthStore();
    await auth.bootstrap();

    expect(auth.status).toBe('authenticated');
    expect(auth.user).toEqual(DEMO_USER);
  });

  it('bootstrap resolves to unauthenticated when no refresh token exists', async () => {
    const auth = useAuthStore();
    await auth.bootstrap();
    expect(auth.status).toBe('unauthenticated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/auth.store.test.ts`
Expected: FAIL — cannot resolve `./auth.store`.

- [ ] **Step 3: Write `src/stores/auth.store.ts`** (Pinia setup-store style — the Pinia-recommended composition syntax)

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api/auth.api';
import { HttpError } from '@/api/http.client';
import { tokenStorage } from '@/utils/token-storage.util';
import type { User } from '@/types/auth.types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const status = ref<AuthStatus>('idle');
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => status.value === 'authenticated');

  async function login(email: string, password: string): Promise<void> {
    status.value = 'loading';
    error.value = null;
    try {
      const response = await authApi.login({ email, password });
      tokenStorage.setTokens(response.accessToken, response.refreshToken);
      user.value = response.user;
      status.value = 'authenticated';
    } catch (caught) {
      user.value = null;
      status.value = 'unauthenticated';
      error.value =
        caught instanceof HttpError && caught.status === 401
          ? 'Invalid email or password'
          : 'Login failed. Please try again.';
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Best effort — the client-side session is cleared regardless.
    }
    tokenStorage.clear();
    user.value = null;
    status.value = 'unauthenticated';
    error.value = null;
  }

  /** Restore a session after a page reload using the persisted refresh token. */
  async function bootstrap(): Promise<void> {
    if (!tokenStorage.getRefreshToken()) {
      status.value = 'unauthenticated';
      return;
    }
    status.value = 'loading';
    try {
      // me() 401s on the stale access token; the HTTP client refreshes and retries.
      user.value = await authApi.me();
      status.value = 'authenticated';
    } catch {
      tokenStorage.clear();
      user.value = null;
      status.value = 'unauthenticated';
    }
  }

  return { user, status, error, isAuthenticated, login, logout, bootstrap };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/auth.store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint:fix && npm test
git add -A
git commit -m "feat: add Pinia auth store (login, logout, session bootstrap)"
```

---

### Task 8: Router, navigation guard, and views

**Files:**
- Create: `src/router/index.ts`, `src/router/index.test.ts`, `src/views/home.view.vue`, `src/views/login.view.vue`, `src/views/login.view.test.ts`, `src/views/dashboard.view.vue`, `src/views/not-found.view.vue`
- Modify: `src/app.vue` (restore the RouterView version from Task 1 Step 11)

**Interfaces:**
- Consumes: `useAuthStore` (Task 7), `config` (Task 2), `logo.svg` (Task 1), `DEMO_*` (Task 5, tests only).
- Produces: `createAppRouter(history?: RouterHistory): Router` — routes `home /`, `login /login`, `dashboard /dashboard` (`meta.requiresAuth: true`, lazy-loaded), `not-found /:pathMatch(.*)*`; a global `beforeEach` guard that lazily bootstraps the session and redirects unauthenticated users to `{ name: 'login', query: { redirect: to.fullPath } }`. Used by `main.ts` (Task 9).

- [ ] **Step 1: Write the failing guard test** — `src/router/index.test.ts`

```ts
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from './index';
import { DEMO_USER } from '@/mocks/handlers';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/router/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Write `src/router/index.ts`**

```ts
import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
} from 'vue-router';
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
```

- [ ] **Step 4: Run guard test to verify it passes**

Run: `npx vitest run src/router/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing login view test** — `src/views/login.view.test.ts`

```ts
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import LoginView from './login.view.vue';
import { DEMO_PASSWORD, DEMO_USER } from '@/mocks/handlers';
import { createAppRouter } from '@/router';
import { useAuthStore } from '@/stores/auth.store';

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
    expect(router.currentRoute.value.name).toBe('dashboard');
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/views/login.view.test.ts`
Expected: FAIL — cannot resolve `./login.view.vue`.

- [ ] **Step 7: Write the views**

`src/views/login.view.vue`:

```vue
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
```

`src/views/home.view.vue`:

```vue
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
```

`src/views/dashboard.view.vue`:

```vue
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
```

`src/views/not-found.view.vue`:

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <main class="mx-auto mt-16 max-w-xl p-8 text-center">
    <h1 class="mb-2 text-3xl font-bold">404</h1>
    <p class="mb-6 text-slate-600">This page does not exist.</p>
    <RouterLink to="/" class="font-semibold text-emerald-600 underline">Back home</RouterLink>
  </main>
</template>
```

- [ ] **Step 8: Restore `src/app.vue` to the RouterView version**

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <RouterView />
</template>
```

- [ ] **Step 9: Run the full suite to verify everything passes**

Run: `npm test`
Expected: PASS — all test files (env, jwt, token-storage, handlers, http.client, auth.store, router guard, login view).

- [ ] **Step 10: Commit**

```bash
npm run typecheck && npm run lint:fix
git add -A
git commit -m "feat: add router with auth guard and views (home/login/dashboard/404)"
```

---

### Task 9: App entry wiring — Pinia + router + MSW in dev

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `config` (Task 2), `worker` (Task 5), `createAppRouter` (Task 8), `App` (Task 1/8).
- Produces: the final entrypoint. Pinia is installed BEFORE the router so the guard's `useAuthStore()` call works. Dev with `VITE_USE_MSW=true` → MSW worker starts before mount; prod builds dead-code-eliminate the mock import (`import.meta.env.DEV` is statically false). Session bootstrap happens lazily in the router guard (Task 8), so no explicit call here.

- [ ] **Step 1: Replace `src/main.ts`**

```ts
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
```

- [ ] **Step 2: Verify the full pipeline**

```bash
npm run typecheck && npm run lint:fix && npm test && npm run build
```

Expected: all green. Confirm the production bundle excludes the mock API — grep for `mock-signature`, a string that exists ONLY in `src/mocks/handlers.ts` (grepping for "msw" would false-positive on the `VITE_USE_MSW` key baked into the bundle):

```bash
grep -rl "mock-signature" dist/assets/ || echo "MOCKS_NOT_IN_BUNDLE"
```

Expected: `MOCKS_NOT_IN_BUNDLE` (the `dist/mockServiceWorker.js` copied from `public/` is fine/expected; only `dist/assets/` matters). If this fails, some production module imports from `@/mocks/*` — only `src/main.ts`'s guarded dynamic import and test files may do that.

- [ ] **Step 3: Manual smoke test (dev server)**

```bash
npm run dev
```

In a browser at the printed URL: Home renders with logo → "Go to dashboard" redirects to /login (with `?redirect=/dashboard`) → sign in with `demo@example.com` / `password123` → Dashboard shows the user → reload the page → session survives (guard bootstraps via refresh token) → Sign out → /dashboard redirects to /login again. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire app entry (Pinia + router + MSW in dev)"
```

---

### Task 10: README + final verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the template's front door, mirroring template-webserver-ts7's README style.

- [ ] **Step 1: Write `README.md`** with these sections (mirror the tone/format of template-webserver-ts7's README — tables for toolchain and scripts):

1. **Title + one-paragraph summary** — production-grade Vue 3 + TS webapp template: Vite, Vue Router 4, Pinia, JWT auth with refresh rotation, MSW mock API, Tailwind v4.
2. **Toolchain table** — vue-tsc (typecheck; note why not tsgo: SFC templates), Biome (lint+format; note `.vue` support covers script blocks), Vite (dev/build), Vitest + @vue/test-utils + MSW (tests), lefthook (hooks), Tailwind v4 (styling).
3. **Requirements** — Node >= 26 (`.nvmrc`, `nvm use`).
4. **Getting started** — `nvm use && npm install && cp .env.example .env.local && npm run dev`, demo credentials `demo@example.com` / `password123`.
5. **Scripts table** — all npm scripts with one-line descriptions.
6. **Environment configuration** — Vite-native `.env` / `.env.<mode>` loading (no dotenv); `src/config/env.ts` validates `import.meta.env` with Zod into a frozen typed `config`; nothing else reads `import.meta.env`; `vite build --mode staging` loads `.env.staging`; only `.env.example` is committed; VITE_* vars are public (never secrets); `DEV_PROXY` / `DEV_PROXY_TARGET` are dev-server-only.
7. **Project structure** — the `src/` tree with one-line comments per folder (config, api, stores, router, views, mocks, types, utils, assets, test) plus `public/`.
8. **Auth flow** — diagram-in-words: login → tokens (access in memory, refresh in localStorage) → 401 → single-flight refresh + rotation → retry → refresh failure → logout redirect; lazy bootstrap in the router guard on first protected navigation; production note about httpOnly cookies.
9. **Mock API vs real backend** — MSW default (`VITE_USE_MSW=true`); flip to a real backend with `VITE_USE_MSW=false` + `DEV_PROXY=true` + `DEV_PROXY_TARGET=<backend url>`; endpoint contract table (`POST /api/auth/login|refresh|logout`, `GET /api/auth/me`) so the backend knows what to implement.
10. **`public/` vs `src/assets/`** — verbatim vs processed (hashed, image-optimized via vite-plugin-image-optimizer).
11. **File suffix convention** — `*.view.vue`, `*.component.vue`, `*.store.ts`, `*.api.ts`, `*.client.ts`, `*.util.ts`, `*.types.ts`, `*.test.ts`.
12. **Code style consistency** — same three layers as the backend template (.vscode settings, Volar + Biome extension recommendations, lefthook pre-commit + `lint:ci` backstop).

- [ ] **Step 2: Final full verification**

```bash
npm run typecheck && npm run lint:ci && npm test && npm run build
```

Expected: all pass with zero errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add README"
```
