# Worker and Queue Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the standalone worker dependency on Next-only modules and isolate favorite recount throughput from catalog work.

**Architecture:** A worker-safe item data service owns catalog reads. Queue names and clients are separated by workload; the outbox publisher batches item IDs before enqueueing recount work.

**Tech Stack:** Next.js 16, TypeScript, Drizzle, Redis, BullMQ, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-worker-queue-isolation-design.md`

## Global Constraints

- Keep public HTTP API response contracts unchanged.
- Do not apply a database migration.
- Keep BullMQ completed/failed retention bounded.
- Add a failing regression test before each production behavior change.

---

### Task 1: Worker-safe catalog read boundary

**Files:**
- Create: `src/entities/item/api/data-service.ts`
- Modify: `src/entities/item/api/server.ts`, `src/worker/processors.ts`
- Test: `src/worker/processors.test.ts`

**Interfaces:**
- Produces `getCatalogItems(page?: number, pageSize?: number): Promise<Item[]>` for Next and worker code.

- [ ] Write a test proving cache warm imports the worker-safe catalog service.
- [ ] Run the test and observe the import-path failure.
- [ ] Move worker-safe catalog reads to `data-service.ts`; make Next server wrapper delegate to it.
- [ ] Run the worker processor test.

### Task 2: Queue isolation and outbox batching

**Files:**
- Modify: `src/server/queue/names.ts`, `src/server/queue/client.ts`, `src/server/queue/jobs.ts`, `src/worker/index.ts`, `src/entities/favorite/api/server.ts`
- Test: `src/server/queue/jobs.test.ts`, `src/entities/favorite/model/outbox.test.ts`

**Interfaces:**
- Produces `getFavoritesQueue()` and an outbox publisher enqueue callback that receives unique item IDs.

- [ ] Write a failing test for one recount enqueue per duplicate item ID batch.
- [ ] Run the test and observe duplicate enqueue behavior.
- [ ] Add the favorites queue and worker with bounded concurrency and retention.
- [ ] Batch outbox item IDs before enqueueing.
- [ ] Run queue and outbox tests.

### Task 3: Full verification

**Files:**
- Modify: `README.md`

- [ ] Document the two-worker startup model.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`.
