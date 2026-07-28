# template-webapp-vue-ts7

A production-grade Vue 3 + TypeScript webapp template: Vite 7+, Vue Router 4, Pinia, JWT
authentication with refresh-token rotation, an MSW-mocked API (with a ready dev-proxy switch to a
real backend), Tailwind CSS v4, and Vitest unit tests. It mirrors the conventions of
`template-webserver-ts7` and its sibling `template-webapp-react-ts7`.

## Toolchain

| Tool | Role |
| --- | --- |
| [Vite](https://vitejs.dev) | Dev server and production build |
| [vue-tsc](https://github.com/vuejs/language-tools) | Typecheck (`npm run typecheck`) — the only checker that understands `.vue` SFC `<template>` blocks; plain `tsc`/`tsgo` cannot parse them |
| [Biome](https://biomejs.dev) | Lint + format (no ESLint, no Prettier). Biome's `.vue` support covers `<script>` blocks only — template expressions are left to vue-tsc |
| [Vitest](https://vitest.dev) + [@vue/test-utils](https://test-utils.vuejs.org) + [MSW](https://mswjs.io) | Unit tests, component mounting, and API mocking |
| [lefthook](https://github.com/evilmartians/lefthook) | Git hooks (pre-commit lint) |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling, via `@tailwindcss/vite` |

**Note:** `vue-tsc`'s installed major does not yet support TypeScript 7's new package
`exports` map (`ERR_PACKAGE_PATH_NOT_EXPORTED` on `typescript/lib/tsc`). This template pins
`typescript` to the latest 5.x release as a result — vue-tsc is non-negotiable since it is the
only checker that understands SFC templates, so this is the side that gives way until vue-tsc
publishes TS7 support.

## Requirements

- Node.js >= 26 (`.nvmrc` pins `26`; run `nvm use`)

## Getting started

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Open the printed URL and sign in with the demo credentials: `demo@example.com` / `password123`
(served by MSW — no backend required).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck, then build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run `vue-tsc --noEmit` |
| `npm run lint` | Check lint + format issues with Biome |
| `npm run lint:fix` | Fix lint + format issues with Biome |
| `npm run lint:ci` | Biome's CI mode (no writes; fails on any issue) |
| `npm run format` | Format all files with Biome |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run prepare` | Install lefthook git hooks (runs automatically after `npm install`) |

**Note:** `test`/`test:watch` set `NODE_OPTIONS=--no-experimental-webstorage`. Node 26 ships an
experimental native `localStorage` global (on by default) that shadows jsdom's per-test
`localStorage` implementation in Vitest's `jsdom` environment, since jsdom's globals are only
installed for keys not already present on Node's global object. Disabling the flag lets jsdom's
`localStorage` take over, as the auth token-storage tests rely on it.

## Environment configuration

Vite loads `.env` / `.env.<mode>` natively — there is **no `dotenv` package**. `src/config/env.ts`
validates `import.meta.env` with Zod into a frozen, typed `config` object; **nothing else in the
app reads `import.meta.env` directly**. Import `config` from `@/config` instead.

- Only `.env.example` is committed. Copy it to `.env.local` for local development (already
  gitignored), or run `vite build --mode staging` to load `.env.staging`, etc.
- `VITE_*` vars are exposed to the browser bundle — **never put secrets in them**.
- `DEV_PROXY` and `DEV_PROXY_TARGET` are dev-server-only: they're read by `vite.config.ts` in
  Node and never reach the browser.

## Project structure

```
src/
  api/        # fetch-based HTTP client + typed API modules (*.client.ts, *.api.ts)
  assets/     # images/icons processed by Vite (hashed, optimized) — import these, don't link them
  config/     # the ONLY place import.meta.env is read (Zod-validated, frozen config)
  mocks/      # MSW request handlers + Node/browser setup (dev + tests)
  router/     # route table and the auth navigation guard
  stores/     # Pinia stores (*.store.ts)
  styles/     # global CSS (Tailwind entrypoint)
  tests/      # Vitest specs, mirroring src/, plus global setup (MSW lifecycle, storage cleanup)
  types/      # shared TypeScript types (*.types.ts)
  utils/      # framework-agnostic helpers (*.util.ts)
  views/      # routed page components (*.view.vue)
public/       # served verbatim (robots.txt, mockServiceWorker.js) — not processed by Vite
```

## Auth flow

1. **Login** — `authApi.login()` posts credentials to `/api/auth/login`; on success the access
   token is kept in memory and the refresh token is persisted to `localStorage` (see
   `src/utils/token-storage.util.ts` for the production-cookie caveat below).
2. **Authenticated requests** — `httpRequest()` attaches `Authorization: Bearer <accessToken>` to
   every call unless `skipAuth` is set (login/refresh themselves must never trigger a refresh).
3. **401 → refresh → retry** — on a 401, the client single-flights a call to `/api/auth/refresh`
   (concurrent 401s share one in-flight refresh instead of racing), stores the rotated token
   pair, and retries the original request exactly once.
4. **Refresh failure → logout** — if the refresh call itself fails (expired/invalid refresh
   token), tokens are cleared and the caller receives an `HttpError`.
5. **Lazy session bootstrap** — the router's `beforeEach` guard only calls `authStore.bootstrap()`
   the first time a `meta.requiresAuth` route is visited while `status === 'idle'`. Bootstrap calls
   `authApi.me()`, which rides on the same 401→refresh→retry mechanism to silently restore a
   session from the persisted refresh token after a page reload.
6. **Logout** — clears both tokens and local auth state, best-effort notifying the server.

**Production note:** the refresh token is persisted to `localStorage` here so the template works
end-to-end against a mock API with zero backend setup. A real backend should instead set the
refresh token as an `httpOnly`, `Secure` cookie — at that point `token-storage.util.ts`'s
`localStorage` calls can be deleted entirely, since the browser would handle persistence.

## Mock API vs. real backend

MSW is enabled by default (`VITE_USE_MSW=true`) and intercepts requests at the network layer in
both the browser (via `public/mockServiceWorker.js`) and Vitest (via `msw/node`), so the app runs
with zero backend setup.

To point at a real backend instead:

```bash
# .env.local
VITE_USE_MSW=false
DEV_PROXY=true
DEV_PROXY_TARGET=http://localhost:3000   # your backend
```

`DEV_PROXY=true` makes `vite.config.ts` proxy `/api/*` to `DEV_PROXY_TARGET`. The backend must
implement this contract:

| Endpoint | Method | Body | Response |
| --- | --- | --- | --- |
| `/api/auth/login` | `POST` | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| `/api/auth/refresh` | `POST` | `{ refreshToken }` | `{ accessToken, refreshToken }` (rotated) |
| `/api/auth/logout` | `POST` | — | `204 No Content` |
| `/api/auth/me` | `GET` | — (Bearer token) | `{ id, email, name }` |

Production builds always exclude the mock API — `src/main.ts` only imports `@/mocks/browser` via
a dynamic import gated behind `import.meta.env.DEV`, which Vite statically eliminates from
production bundles.

## `public/` vs. `src/assets/`

- **`public/`** is served verbatim at the site root, untouched by Vite — e.g. `robots.txt`,
  `mockServiceWorker.js`.
- **`src/assets/`** is processed by Vite: imported files are hashed for cache-busting and images
  are optimized by `vite-plugin-image-optimizer` (via `sharp`/`svgo`) at build time.

## File suffix convention

Kebab-case filenames with a role suffix, always imported through the `@/` alias:

| Suffix | Role |
| --- | --- |
| `*.view.vue` | Routed page component |
| `*.component.vue` | Reusable (non-routed) component |
| `*.store.ts` | Pinia store |
| `*.api.ts` | Typed API call group |
| `*.client.ts` | Low-level transport (HTTP client) |
| `*.util.ts` | Framework-agnostic helper |
| `*.types.ts` | Shared TypeScript types |
| `*.constant.ts` | Shared constants |
| `*.test.ts` | Unit test (in `src/tests/`, mirrors `src/` structure) |

## Code style consistency

Three layers keep formatting and linting consistent without relying on memory:

1. **Editor** — `.vscode/settings.json` sets Biome as the default formatter (format-on-save) for
   JS/TS/Vue/JSON; `.vscode/extensions.json` recommends the Biome and Volar (`Vue.volar`)
   extensions so SFC IntelliSense and Biome formatting both work out of the box.
2. **Pre-commit** — lefthook runs `biome check --write` on staged files before every commit.
3. **CI backstop** — `npm run lint:ci` (`biome ci .`) fails the build on any remaining issue,
   catching anything a contributor's editor or hook missed.
