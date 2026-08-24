# Task 4: Docker Compose orchestration

Implemented the Compose deployment stack and its configuration verifier.

- `redis` is private, persistent, append-only, uses `noeviction`, and has a
  `redis-cli ping` healthcheck.
- `migrate` waits for Redis and (when the `local-db` profile is enabled)
  healthy Postgres, uses `DIRECT_URL`, and gates `web`, `worker`, and demo
  `seed` on successful completion.
- `web` is the only service with a host port, checks `/api/health`, and both
  long-running services use `init`, `unless-stopped`, and graceful stop bounds.
- `postgres` is an internal `local-db` profile service; `seed` is an internal
  `demo` profile service. External database/Redis URLs remain runtime values,
  while `NEXT_PUBLIC_APP_URL` is the sole build argument.
- Added the minimal non-root `seed` Docker target, containing only the seed
  program, tsconfig path aliases, and the database client in addition to the
  inherited migration inputs. The web and worker targets remain unchanged.
- Added `verify:compose` and Docker lifecycle npm scripts, plus `.env.example`
  placeholders for both external and fully local operation.

Verification run:

- `npm test` — 27 files, 84 tests passed.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `node scripts/verify-docker-layout.mjs` — passed.
- `npm run verify:compose` — passed.
- `git diff --check` — passed.

Docker is not installed in the execution environment, so `docker compose config`,
`npm run docker:build`, and the requested local-db/demo smoke flow could not run.
A static YAML parse confirmed the six services, single `3000:3000` host mapping,
internal network, and worker Redis liveness command.
