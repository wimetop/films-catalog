# Docker Runtime Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable Docker worker processing, truthful readiness checks, and documented production deployment guarantees.

**Architecture:** The worker publishes a Redis heartbeat and exits on unrecoverable queue/client failures; Compose verifies that heartbeat. Trending falls back to Postgres for an absent Redis projection, while the web endpoint requires both Postgres and Redis. Docker installs a minimal dedicated runtime dependency set for the compiled worker.

**Tech Stack:** Next.js 16 standalone, TypeScript, Vitest, BullMQ, ioredis, Docker Compose, Node 20+.

**Spec:** `docs/superpowers/specs/2026-08-25-docker-runtime-hardening-design.md`

## Global Constraints

- Preserve cache-aside graceful fallback for catalog requests while making deployment health strict.
- Worker production runtime must contain no `tsx`, `drizzle-kit`, `vitest`, `vite`, or `esbuild`.
- Public host port remains web-only port 3000; services run as non-root.
- Tests and static checks must run on Node 20+ including the pinned Node 22 Docker base.

---

### Task 1: Worker liveness and recovery

**Files:** `src/worker/index.ts`, `src/worker/index.test.ts`, `src/server/cache/keys.ts`, `docker-compose.yml`, `scripts/verify-compose.mjs`

- [ ] Write failing tests that a successful job and the periodic tick refresh the worker heartbeat, then run the focused test.
- [ ] Add a namespaced heartbeat key, bounded TTL refresh, one bootstrap Trending rebuild, completion logging, and terminal error handlers that exit after reporting the failure.
- [ ] Replace the worker Compose probe with a TTL-aware heartbeat check and verify the focused test and Compose verifier.

### Task 2: Trending and health contracts

**Files:** `src/entities/trending/api/server.ts`, `src/entities/trending/api/server.test.ts`, `src/worker/processors.ts`, `src/app/(api)/api/health/route.ts`, `src/app/(api)/api/health/route.test.ts`

- [ ] Write failing tests for empty-ZSET Postgres fallback and Redis-unavailable health 503, then run each focused test.
- [ ] Remove ZSET expiry; implement empty projection fallback and timeout-bounded strict health status.
- [ ] Run the focused tests and the cache/worker suite.

### Task 3: Production image and Compose lifecycle

**Files:** `Dockerfile`, `docker-compose.yml`, `package.json`, `scripts/verify-compose.mjs`, `scripts/verify-docker-layout.mjs`, `scripts/verify-worker-build.mjs`

- [ ] Write/update failing static verifier assertions for clean worker dependencies, migration dependency, restart policies, `--wait`, and Node-22-safe regex escaping.
- [ ] Build the worker dependency micro-stage, make Compose lifecycle/dependency changes, and wire static checks into Docker npm commands plus aggregate `verify`.
- [ ] Run static verifiers under Node 22 and inspect the worker image dependency tree.

### Task 4: Configuration, docs, and data hygiene

**Files:** `src/config/env/env.server.ts`, `src/config/env/env.server.test.ts`, `.env.example`, `README.md`, migration files if an unused index is confirmed

- [ ] Write the failing secret-length validation test and verify it fails.
- [ ] Enforce 32-character secrets, provide development Redis configuration, document strict health/SWR/worker recovery, and remove only the confirmed redundant index through a migration.
- [ ] Run environment tests and validate Compose interpolation with `docker compose config`.

### Task 5: Review and regression investigation

**Files:** all modified files

- [ ] Run `npm test`, lint, typecheck, build, worker build verification, Compose verification, Docker layout verification, and `docker compose config`.
- [ ] Run a Redis-restart Compose smoke test; inspect worker logs, heartbeat freshness, delayed/completed jobs, and Trending response before and after recovery.
- [ ] Review the diff for secret exposure, root execution, unbounded shutdown, stale health semantics, and untested behavior; fix only defects with a reproduced cause.
