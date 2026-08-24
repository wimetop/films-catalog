# Docker Deployment Design

## Goal

Package the existing Next.js catalog, BullMQ worker, Redis cache, and Drizzle
migrations as a reproducible Docker Compose deployment.  The application logic
remains unchanged, except for a public health endpoint and a production worker
bundle.

## Selected Architecture

One multi-stage `Dockerfile` produces three purpose-built final targets:

- `web` contains Next.js standalone output, static assets, and `public`; it
  starts with `node server.js`.
- `worker` contains the compiled `dist/worker/index.js` artifact and the
  production runtime dependencies it requires; it starts with
  `node dist/worker/index.js`, never `tsx`.
- `migrate` contains Drizzle Kit, the schema and checked-in `drizzle` SQL
  migrations.  It is a one-shot service and runs with `DIRECT_URL`.

The shared `deps` stage copies `package.json` and `package-lock.json` before
`npm ci`, preserving Docker layer caching.  The shared `build` stage then copies
the source, runs the worker bundle, and executes `next build`.  Next is set to
`output: "standalone"`.  Final web and worker stages are non-root and exclude
source files, tests, `.next/cache`, `tsx`, and Drizzle Kit.

The worker build uses esbuild.  It bundles the worker entry point while preserving
the `react-server` condition needed by server-only imports and handles BullMQ and
ioredis as runtime-compatible dependencies.  The exact esbuild command is exposed
as an npm script so local CI can verify the generated artifact.

## Compose Topology

`docker-compose.yml` defines an internal application network and these services:

1. `redis` runs Redis 7 Alpine with append-only persistence and `noeviction`, a
   volume, and a `redis-cli ping` healthcheck.
2. `migrate` waits for Redis and, when enabled, local PostgreSQL.  It runs Drizzle
   migrations once and exits successfully.
3. `web` and `worker` use `depends_on` with
   `migrate.condition: service_completed_successfully`. Both use `init: true`,
   `restart: unless-stopped`, and a bounded graceful-stop period.
4. `postgres` is available only through the `local-db` profile, persists its data,
   and exposes no host port.
5. `seed` is available only through the `demo` profile and runs after migration.

Only `web` maps port 3000 to the host. Redis, PostgreSQL, migration, seed, and
worker services remain internal.  The standard deployment receives externally
managed `DATABASE_URL` (transaction pooler) and `DIRECT_URL` (direct/session
pooler). The `local-db` profile substitutes URLs pointing at the private
`postgres` service, allowing a self-contained development stack.

## Configuration and Security

Compose obtains runtime configuration from an uncommitted `.env` file and ships a
non-secret `.env.example`. `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, Redis/cache values, and scheduler values are runtime variables.
`NEXT_PUBLIC_APP_URL` is a build argument because public Next variables are baked
into the bundle. `.dockerignore` excludes `.env*`, Git metadata, node modules,
build output, tests, coverage, Playwright output, and unrelated development files.
The committed migration SQL remains available only to the migration build target.

The existing server environment schema remains the startup authority: missing or
malformed required runtime variables terminate the relevant process with its clear
validation message. Secrets are never copied into image layers.

## Health and Shutdown

`GET /api/health` is public and dynamically checks the Drizzle database connection
and Redis ping. It returns `200 {"status":"ok"}` only if both are reachable;
otherwise it returns `503` with safe per-dependency statuses, without credentials
or raw connection errors. Web's Docker healthcheck calls this endpoint.

Redis failure does not change the app's existing cache-aside graceful-degradation:
normal catalog requests may fall back to Postgres. The health endpoint still reports
the dependency failure so readiness reflects the full deployment state.

Compose `init: true` lets SIGTERM reach the worker. Its existing shutdown handler
closes BullMQ workers and queues before Redis; `stop_grace_period` gives inflight
jobs time to finish. The web process is similarly terminated by the standard Node
server signal path.

## Verification and Documentation

Add health route unit tests for healthy and unavailable dependency states. Run the
worker production bundle directly with Node as a build verification. Validate
`docker compose config`; build and run Compose when Docker is available. README
documents environment setup, `docker compose up --build`, optional
`local-db`/`demo` profiles, migration behavior, Redis graceful degradation, and
`docker:build`, `docker:up`, `docker:down`, and `docker:logs` scripts.

Out of scope: Kubernetes, cloud-provider deployment manifests, TLS/reverse-proxy
configuration, autoscaling, and changes to the catalog, authentication, cache, or
queue business logic.
