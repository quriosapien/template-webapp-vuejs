# Roadmap — template-webapp-vuejs

A production-grade Vue 3 + TypeScript webapp template: Vite 8, Vue Router 5,
Pinia 4, JWT auth with refresh-token rotation, MSW-mocked API, Tailwind CSS v4.
Mirrors `template-webapp-reactjs`'s conventions. This roadmap is a record of
intent — items here are candidates, not commitments. Pick one up, or leave the
repo as-is.

Where an item is identical to the React sibling's roadmap, this file says so
rather than restating it — read both together.

## Now — parity + hardening, no new dependencies

- **Add `.github/workflows/ci.yml`.** Same gap as `template-webapp-reactjs`:
  no CI today. Copy `template-webserver-ts7`'s workflow shape, including its
  npm 12 upgrade before `npm ci` — Node 26 bundles npm 11, and this repo's
  `devEngines` rejects that with `EBADDEVENGINES`. Keep this repo's `test` /
  `test:watch` scripts as-is — they already set
  `NODE_OPTIONS=--no-experimental-webstorage` to keep Node 26's native
  `localStorage` global from shadowing jsdom's in Vitest; carry that through
  unchanged. The webserver workflow runs `test:coverage`; this repo has no
  such script yet, so the copied job runs `test` until the coverage item
  below lands.

- **Add `CLAUDE.md` + `CONTRIBUTING.md` + `LICENSE`.** Only
  `template-webserver-ts7` has these today. Carry the Vue-specific rules the
  README already explains into `CLAUDE.md`: Biome only parses a `.vue` file's
  `<script>` block (never `<template>`), so `noUnusedImports` /
  `noUnusedVariables` / `useVueMultiWordComponentNames` are intentionally off
  for `**/*.vue` in `biome.json` — `vue-tsc` already enforces those with full
  template awareness. Also: only `src/config/env.ts` reads
  `import.meta.env`.

- **Add coverage thresholds + a `test:coverage` script** — same pattern as the
  React sibling, sourced from `template-webserver-ts7/vitest.config.ts`.

- **Add `src/components/`.** The README's project-structure table already
  documents a `*.component.vue` convention (parallel to React's
  `src/components/`), but no such directory exists yet in this repo — nothing
  currently needs a shared component, so it's been skipped. Add the directory
  (with a `.gitkeep` or a first real component) the moment one is needed
  rather than letting the README describe a convention with no home.

## Next — meaningful advancement, small dependency cost

- **Standing item: recheck the vue-tsc / TypeScript 7 gate on every sweep.**
  This repo is deliberately held on TypeScript 6.x. Latest stable `vue` is
  `3.5.46` (already the pin here) and peers `typescript: *`. `vue@3.6` is
  still pre-release (`3.6.0-rc.16`) and stays
  out under the no-pre-release rule. The hold is `vue-tsc`: its installed
  major resolves `typescript/lib/tsc`, which TypeScript 7's `exports` map
  does not publish (`ERR_PACKAGE_PATH_NOT_EXPORTED`), and `vue-tsc` is
  non-negotiable since it is the only stable checker that understands `.vue`
  SFC `<template>` blocks. The upstream replacement, Vue Language Tools v4
  (`@vue/content-mapper`), is still alpha and requires TypeScript 7.1, which
  is still beta (`7.1.0-beta`).
  _Steps (repeat each sweep):_ `npm install typescript@latest --save-dev`
  (or bump the pin), run `npm run typecheck`; if it fails with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`, revert. If it passes, this repo can join
  `template-webapp-reactjs` and `template-webserver-ts7` on TS7.
  _Done when:_ stable `vue-tsc` (or a stable v4 replacement) supports the
  TypeScript release npm calls `latest`, and this repo's `typescript` pin
  moves to `^7`.
  _Rechecked 2026-11-21:_ `typescript@7.0.2` still does not export
  `./lib/tsc` (`ERR_PACKAGE_PATH_NOT_EXPORTED`). `vue-tsc@3.3.14` still
  resolves that path. Staying on `typescript@^6.0.3`. Latest 6.x is `6.0.3`,
  so the pin is current.

- **Validate the login payload with Zod.** Same gap and same reasoning as
  `template-webapp-reactjs`'s roadmap — `zod` is already a dependency.

- **Add a test for the router guard's bootstrap-on-401 path.** The `beforeEach`
  guard only calls `authStore.bootstrap()` the first time a
  `meta.requiresAuth` route is visited while `status === 'idle'`; that lazy
  condition is the subtlest logic in this repo and deserves its own explicit
  test rather than only being exercised incidentally by other specs.

## Later — opt-in, adds a real dependency

- **Playwright e2e** — same recommendation as React: worth it, catches broken
  auth redirects end to end.
- **TanStack Query** — recommend _against_, same reasoning as React: one
  server-state store, already covered by the single-flight refresh in
  `src/api/http.client.ts`.
- **vee-validate** (this repo's equivalent of React's `react-hook-form`) —
  only if forms grow past the single login form.
- **Renovate config**, shared shape with the React sibling.

## Deliberately not doing

- **ESLint / Prettier** — Biome replaces both.
- **Options API components** — this template is Composition API + `<script
  setup>` throughout; don't introduce the older API style.
- **Upgrading `typescript` past 6.x independently of the vue-tsc gate above**
  — the pin is intentional, not an oversight; see the Next item. Vue stays
  on latest stable 3.5; do not take the 3.6 pre-release to chase TypeScript.

## Family conventions

These rules are shared across the `template-*` repos and apply here too:

- `biome.json`'s `$schema` URL tracks the installed `@biomejs/biome`
  version — bump both together.
- Manifests pin `^<then-latest>`; `allowScripts` keys embed exact versions and
  move in lockstep with the packages they gate.
- No pre-release dependencies. Two standing exceptions, each documented in the
  repo that uses them: `@typescript/native-preview` (tsgo, used by
  `template-webapp-reactjs` and `template-webserver-ts7` — not here, per the
  vue-tsc gate above), and `template-docs-vitepress`'s `vitepress@2.0.0-alpha`
  pin (taken for a security reason — see that repo's README).
- Dependency sweeps commit with a lowercase `setup:` or `chore(deps):` prefix.
  Nothing is pushed without the user's say-so.
- **This repo stays on TypeScript 6** until `vue-tsc` supports TS7's exports
  map — this is the repo the rule is about; see the Next item above for the
  recheck procedure. Vue's own package is already compatible with TypeScript
  7 (`peerDependencies.typescript` is `*`); the gate is the checker.
- **Node 26 everywhere**, enforced here by `devEngines` (`onFail: error` for
  Node >= 26 and npm >= 12; an older toolchain fails with `EBADDEVENGINES`).
  Node 26 bundles npm 11, so the CI workflow still to add (Now) installs npm
  12 before `npm ci`.
