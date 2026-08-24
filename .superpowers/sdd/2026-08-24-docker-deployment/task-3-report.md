# Task 3 Report: Secure Multi-stage Docker Targets

## Status

Implemented and committed secure Docker image targets in worktree
`C:\Users\Danylo\Documents\ChatGPT\filmscatalog\.worktrees\docker-deployment`.

Commit: `cea9787 build: add non-root Docker images`

## Delivered

- Added `Dockerfile` with the exact required Node 22 Alpine digest, cached
  `deps` stage, worker build, and final `web`, `worker`, and `migrate` targets.
- `web` copies only Next standalone output, static assets, and `public`; it
  sets `PORT=3000`, `HOSTNAME=0.0.0.0`, and exposes port 3000 as image metadata.
- `worker` runs the CommonJS `dist/worker/index.js` artifact with production
  dependencies only.
- `migrate` runs as `node`, includes Drizzle Kit/schema/migrations, and copies
  checked-in migration SQL with `--chown=node:node`.
- All final targets run as non-root `node`; no Dockerfile instruction copies
  `.env` files. Build-only configuration is deterministic placeholder data in
  the discarded `build` stage, required because Next evaluates server modules
  during `next build`.
- Added `.dockerignore` rules for environment files, Git metadata,
  dependencies, build output, tests, coverage, reports, and development files.
- Added `scripts/verify-docker-layout.mjs` to enforce the required image layout.

## TDD / Verification Evidence

- RED observed: `node scripts/verify-docker-layout.mjs` failed with
  `Dockerfile is missing.` before the Docker files were created.
- GREEN: `node scripts/verify-docker-layout.mjs` passes after implementation.
- `npm run build:worker` passed.
- `npm run build` passed with the same non-secret build-stage placeholder
  environment values used by the Dockerfile.
- `npm run lint` passed.
- `npm test` passed: 26 files, 63 tests.
- `git show --check --oneline HEAD` passed; worktree is clean.

## Concern

The requested `docker build --target web -t filmscatalog-web:test .` could not
run because Docker is not installed/available in this execution environment:
`docker` was not recognized as a command. The Docker layout verifier and the
equivalent local worker/Next build commands passed.

## Round 1 Review Fix

Commit: `9c8d957 test: harden Docker layout verification`

The layout verifier now also enforces:

- `deps` copies both lock manifests before `npm ci`.
- `production-deps` prunes development dependencies and the worker copies
  `node_modules` only from that stage.
- `migrate` includes its Drizzle config, schema, checked-in SQL, and the
  `deps` node modules containing Drizzle Kit.
- The web target has no `COPY` sources beyond standalone, static, public, and
  optional package metadata.
- `.dockerignore` excludes `.env*`, `.git`, `node_modules`, `.next`, coverage,
  reports, test files, and test directories.

Added a Vitest mutation suite that invokes the verifier against temporary,
altered Dockerfile and ignore inputs. It observed the missing assertions fail
before the verifier changes and now passes 12 mutation checks. Fresh validation:
`node scripts/verify-docker-layout.mjs`, targeted mutation test, `npm test`
(27 files / 75 tests), and `npm run lint` all passed.

## Round 2 Review Fix

Commit: `90e658e test: close Docker layout verifier gaps`

Removed the verifier's package-metadata exception: the final web target may now
copy only standalone, static, and public runtime assets. The ignore verifier now
also requires `dist`, `build`, `out`, `test-results`, and `playwright-report`.

RED evidence: mutations adding a web-stage `/app/package.json` copy and removing
each of those five ignore patterns all passed the prior verifier (six targeted
test failures). GREEN evidence: the updated mutation suite passes 18 checks;
fresh `node scripts/verify-docker-layout.mjs`, `npm test` (27 files / 81 tests),
and `npm run lint` passed.
