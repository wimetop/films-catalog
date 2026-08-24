# Task 2 Report — Production Worker Bundle

## Scope

Implemented only the standalone Next.js output and production worker bundle requirements. Docker and Compose files were not added or modified.

## Changes

- Set `output: "standalone"` in `next.config.ts`, producing `.next/standalone/server.js` during a production Next build.
- Added `esbuild` as a development dependency and the `build:worker` / `verify:worker-build` package scripts.
- Added `scripts/build-worker.mjs`, which bundles `src/worker/index.ts` with:
  - `target: "node22"`
  - `platform: "node"`
  - `format: "cjs"`
  - `conditions: ["react-server"]`
  - `external: ["bullmq", "ioredis"]`
  - `tsconfig: "tsconfig.json"` (resolves the `@/*` alias)
- Added `scripts/verify-worker-build.mjs` to read `dist/worker/index.js` as generated source text and reject a `tsx` reference.
- Ignored generated `dist/` output and excluded it from ESLint, so a local production build does not leave generated CJS code in lint scope.

## TDD evidence

### RED

Before adding the builder, `node scripts/verify-worker-build.mjs` exited 1 with:

```text
Worker build verification failed: dist/worker/index.js is missing.
```

This test catches removal or failure of the production worker build and a regression that brings a `tsx` runtime reference into the artifact.

### GREEN

After adding the builder and package scripts:

```text
> filmscatalog@0.1.0 build:worker
> node scripts/build-worker.mjs

> filmscatalog@0.1.0 verify:worker-build
> node scripts/verify-worker-build.mjs

Worker build verification passed.
```

Artifact inspection confirmed `@/` was absent, `require("bullmq")` and `require("ioredis")` remained external, and `tsx` was absent.

## Verification

- `npm run build:worker` — exit 0.
- `npm run verify:worker-build` — exit 0.
- `node dist/worker/index.js` with intentionally invalid environment values — exited 1 with the expected clear `Invalid server environment:` validation message listing invalid values.
- `npm test` — 26 test files and 63 tests passed.
- `npm run lint` — exit 0 after excluding generated `dist/**`.
- `npx tsc --noEmit` — exit 0.
- `npm run build` with temporary valid non-secret placeholder build variables — exit 0; `.next/standalone/server.js` exists. The placeholder Better Auth secret generated expected low-entropy warnings only.
- `git diff --check` — exit 0.

## Files changed

- `.gitignore`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `scripts/build-worker.mjs`
- `scripts/verify-worker-build.mjs`

## Self-review

- The build script contains every required esbuild setting and no Docker/Compose scope expanded into this task.
- The artifact verification reads the generated bundle source text and was observed failing before the builder existed.
- The only local verification-environment limitation was native esbuild filesystem traversal under the sandbox; the successful production worker build was therefore run with approved unsandboxed access. The configured target remains Node 22; this workstation runs Node 24.18.0.

## Review follow-up — verifier contract strengthening

The verifier now also rejects unresolved `@/` aliases, the `server-only` marker, and the server-only client guard text. It rejects top-level ESM `import` or `export` syntax, and requires literal CommonJS `require("bullmq")` and `require("ioredis")` calls so both runtime dependencies remain external.

TDD evidence for this follow-up:

1. A temporary generated-bundle probe appended an unresolved `@/` alias. The old verifier exited 0, demonstrating the coverage gap.
2. After adding the new checks, the same probe made `npm run verify:worker-build` exit 1 with `contains an unresolved @/ alias.`
3. `npm run build:worker` regenerated the bundle, and `npm run verify:worker-build` exited 0.

Follow-up verification also passed: `npm test` (26 files, 63 tests), `npm run lint`, `npx tsc --noEmit`, and `git diff --check`.
