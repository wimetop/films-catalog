# Resilience Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the identified cache, worker, schema metadata, UX, and operational resilience gaps.

**Architecture:** Keep Postgres as the source of truth, serialize the Redis favorites projection, and retain outbox batching. Cache failures bypass Redis through existing circuit-breaker and semaphore primitives. Metadata changes describe indexes created by existing migrations, so no production DDL replay is introduced.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, Supabase Postgres, ioredis, BullMQ, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-resilience-follow-up-design.md`

## Global Constraints

- Do not write credentials to `.env.local` or commit secrets.
- Preserve existing API response contracts.
- Do not add a new migration for indexes already created by migrations `0004`, `0005`, and `0007`.
- Every behavior change begins with a failing test.

---

### Task 1: Serialize the favorites projection

**Files:**
- Modify: `src/worker/index.ts`
- Modify: `src/server/queue/jobs.ts`
- Test: `src/server/queue/jobs.test.ts`

- [ ] Add a failing assertion for the poll interval and isolated favorites execution contract.
- [ ] Set favorites worker concurrency to `1`; change outbox scheduler frequency to two seconds.
- [ ] Run targeted worker/queue tests.

### Task 2: Close cache paths

**Files:**
- Modify: `src/entities/item/api/catalog-service.ts`
- Modify: `src/entities/item/api/catalog-service.test.ts`
- Modify: `src/entities/trending/api/server.ts`
- Modify: `src/entities/trending/api/server.test.ts`

- [ ] Add failing tests for circuit-open version reads and invalid trending cache envelopes.
- [ ] Gate catalog-version reads with `canUseRedis`; validate trending cache with its Zod envelope parser.
- [ ] Run targeted cache tests.

### Task 3: Make outbox index metadata non-destructive

**Files:**
- Modify: `src/db/schema/outbox-event.ts`
- Modify: `src/db/schema/outbox-event.test.ts`
- Modify: `drizzle/meta/0008_snapshot.json`

- [ ] Add failing schema assertions for partial pending and terminal indexes.
- [ ] Declare indexes with Drizzle partial-index predicates and synchronize snapshot metadata.
- [ ] Run `npm run db:generate` and confirm no destructive migration is generated.

### Task 4: Repair eventual-consistency UX and worker startup behavior

**Files:**
- Modify: `src/features/toggle-favorite/ui/favorite-button.tsx`
- Modify: `src/features/toggle-favorite/ui/favorite-button.test.tsx` or extracted helper test
- Modify: `src/worker/index.ts`
- Test: `src/worker/processors.test.ts`

- [ ] Add a failing test for bounded trending refetch scheduling after mutation.
- [ ] Schedule a bounded client retry window and enqueue one cache warm job at worker startup.
- [ ] Run targeted tests.

### Task 5: Operational hardening and documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: public API routes and rate-limit tests as needed
- Create: `scripts/verify-cache-worker-flow.ts`
- Remove: dead export from `src/worker/processors.ts`

- [ ] Add missing public-route rate-limit coverage and a local Redis/BullMQ integration smoke script.
- [ ] Apply the limiter to all public catalog/trending write/read routes consistent with safe request identity.
- [ ] Document configuration, retry projection fallback, and integration prerequisites.
- [ ] Run full verification.
