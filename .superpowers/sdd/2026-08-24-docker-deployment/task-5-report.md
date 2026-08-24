# Task 5 report — Docker operational documentation and verification

## Delivered

- Added a complete README Docker Compose workflow for external PostgreSQL,
  local Postgres through the `local-db` overlay, optional demo seed, automatic
  migration gating, the exact npm lifecycle scripts, health semantics, logs,
  and graceful shutdown.
- Updated `.env.example` so Compose-specific values are explicit placeholders.
  It explains that Compose reads `.env`, not `.env.local`.
- The base Compose stack now requires external `DATABASE_URL`/`DIRECT_URL`
  values instead of silently falling back to private-Postgres credentials.
- The local-db overlay deterministically overrides every database consumer to
  `postgres:5432`, while interpolating `POSTGRES_PASSWORD`. This keeps it
  independent of external database URLs in `.env` and prevents the database
  service and its consumers from using different passwords.
- Extended the Compose verifier and its tests to validate the configurable
  local password. The verifier now self-validates the checked-in Compose pair.

## Verification

- `npm test` — passed: 28 files, 89 tests.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `next build` with the repository's existing local runtime environment loaded
  without printing secrets — passed.
- `node scripts/verify-docker-layout.mjs` — passed.
- `npm run verify:compose` — passed.
- `npm run verify:worker-build` — passed for the existing artifact.

## Environment limitations

- Docker CLI is not installed in this execution environment. Consequently,
  `docker compose config`, image build, local-db/demo smoke flow, Redis-kill
  degraded-health check, and graceful worker-shutdown observation could not be
  run. They are not claimed as verified.
- `npm run build:worker` could not run in this nested worktree: esbuild reports
  `Cannot read directory "../../../../..": Access is denied` and cannot resolve
  the otherwise present `src/worker/index.ts`, including when invoked with an
  absolute entry point. This is a sandbox/worktree filesystem limitation; no
  worker-source change was made in Task 5.

## Final review fixes

- Added a standalone `docker-compose.dev-redis.yml` and
  `docker:dev-redis:up`/`docker:dev-redis:down` scripts. Host development can
  now run Redis on `localhost:6379` without parsing the production stack or
  supplying unrelated application environment values; production Redis remains
  private.
- Bounded the health route's Redis ping with the existing 500 ms Redis timeout.
  A regression test holds the ping forever and proves the route returns its
  degraded `200` response within 750 ms, well below Compose's 5 s healthcheck
  timeout.
- Added `verify:docker-env`, invoked by all Docker start/build scripts that use
  the local database. It accepts `POSTGRES_PASSWORD` only when it contains RFC
  3986 unreserved characters (`A-Z`, `a-z`, `0-9`, `.`, `_`, `~`, `-`), so the
  value supplied to Postgres exactly matches the local database URL.
- Added the local Postgres entrypoint SQL hook. On initialization it
  idempotently creates the `anon` and `authenticated` NOLOGIN roles before
  migrations, allowing checked-in migrations to revoke their privileges.

Final-review verification:

- Focused health, Compose, and Docker-environment tests — 16 tests passed.
- Full `npm test` — 29 files, 95 tests passed.
- `npm run lint` and `npx tsc --noEmit` — passed.
- Next production build with the existing local runtime environment loaded
  without printing secrets — passed.
- `npm run verify:compose`, `node scripts/verify-docker-layout.mjs`, and
  `npm run verify:worker-build` — passed.
- Docker CLI and nested-worktree esbuild limitations above remain unchanged;
  Docker smoke and a fresh worker bundle are not claimed as verified.

## Final P2 follow-up

- `docker:dev-redis:up` and `docker:dev-redis:down` now both specify the
  `filmscatalog-dev-redis` Compose project, isolating host-development Redis
  containers and volumes from the production Compose project.
- `verify-docker-env` now validates the same `POSTGRES_PASSWORD` source Docker
  Compose uses: a defined shell value takes precedence over `.env`; otherwise
  the `.env` value is validated. Regression tests prove an unsafe shell
  override is rejected even with a safe file, and that a safe shell value wins
  over an unsafe file.

Verification: focused Compose and Docker-environment regression tests passed
(13 tests), followed by `npx tsc --noEmit`, `npm run lint`, and `git diff
--check` with successful exit status.
