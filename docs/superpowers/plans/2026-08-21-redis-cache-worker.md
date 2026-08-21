# Redis Cache and Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Redis cache-aside, BullMQ background work, and a Trending section to the existing films catalog without changing its existing API contracts.

**Architecture:** PostgreSQL remains the source of truth. Next.js reads public catalog DTOs through a Redis cache-aside service which degrades to Drizzle when Redis is unavailable. Favorite mutations persist first, then enqueue idempotent BullMQ jobs that update a Redis ZSET and invalidate only affected cache entries; a separate worker registers and processes the jobs.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle/Postgres, Redis 7, ioredis, BullMQ, TanStack Query, Vitest, Docker Compose.

**Spec:** `C:\Users\Danylo\Downloads\Telegram Desktop\next_task3.md`

## Global Constraints

- Keep the existing Next.js 16 + Drizzle + Supabase + Better Auth + TanStack Query stack and project structure.
- Do not put a queue in process memory or run background loops from a Next.js route.
- Keep existing public API response shapes; `/api/items` continues returning `Item[]`.
- Cache only serialized API DTOs and use explicit TTLs; Redis must never cause a user-facing 500 when it is unavailable.
- User-dependent favorite-cache keys must include `userId`.
- Use targeted invalidation only; never use `FLUSHDB`.
- Every production behavior starts with a focused failing Vitest test.

---

### Task 1: Redis runtime configuration and local service

**Files:**
- Create: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `src/config/env/env.server.ts`
- Modify: `package.json`
- Test: `src/config/env/env.server.test.ts`

**Produces:** Validated `envServer.redisUrl`, cache TTL values, Trending configuration, `npm run worker`, and a local Redis 7 service.

- [ ] Write tests for a valid Redis URL, invalid TTL and missing `REDIS_URL`.
- [ ] Run `npm test -- src/config/env/env.server.test.ts` and confirm the tests fail because the config is incomplete.
- [ ] Add ioredis and BullMQ; add the Docker service, public `.env.example` names, parsed integer environment values, and the worker script.
- [ ] Re-run the test, then `npm run lint`.
- [ ] Commit as `chore: add redis runtime configuration`.

### Task 2: Cache primitives, namespaced keys and metrics

**Files:**
- Create: `src/server/cache/client.ts`
- Create: `src/server/cache/keys.ts`
- Create: `src/server/cache/stats.ts`
- Create: `src/server/cache/keys.test.ts`
- Create: `src/server/cache/stats.test.ts`

**Produces:** `cacheKeys` builders for every specified key; non-throwing Redis operations; counters for item list/detail hits and misses.

- [ ] Write failing tests asserting exact versioned keys and that favorite-list keys differ between users.
- [ ] Run the two tests and confirm failures because the modules do not exist.
- [ ] Implement key builders, scoped Redis singleton creation, safe logging/fallback wrapper, and metric helpers.
- [ ] Re-run focused tests and the full Vitest suite.
- [ ] Commit as `feat: add redis cache primitives`.

### Task 3: Tested cache-aside with single-flight and negative values

**Files:**
- Create: `src/server/cache/cache-aside.ts`
- Create: `src/server/cache/cache-aside.test.ts`

**Produces:** A generic `readThroughCache<T>` that returns cached JSON, reads a loader on miss, uses `SET NX PX` locks, and accepts a short TTL for a cached `null` value.

- [ ] Write failing tests for hit, miss-and-store, Redis error fallback, null caching, and only one loader execution for concurrent callers.
- [ ] Run the test and confirm each failure is caused by absent functionality.
- [ ] Implement the minimal injected-client cache-aside helper and lock-release safety.
- [ ] Re-run the focused test and all tests.
- [ ] Commit as `feat: add cache aside single flight helper`.

### Task 4: Cache existing items endpoints and invalidate item writes

**Files:**
- Modify: `src/entities/item/api/server.ts`
- Modify: `src/entities/item/api/server.test.ts`
- Modify: `src/app/(api)/api/items/route.test.ts`
- Modify: `src/app/(api)/api/items/[id]/route.ts`
- Modify: `src/app/(api)/api/items/route.ts`

**Produces:** Redis-backed `getItems` and `getItemById`; a 404 negative cache; point invalidation after item creation; unchanged response DTOs.

- [ ] Write failing tests for list/detail first read miss, repeated read hit, invalid UUID/absent item behavior, and item-write invalidation.
- [ ] Run affected tests and confirm the old `unstable_cache` implementation cannot satisfy them.
- [ ] Replace the current Next Data Cache for items with Redis cache-aside while retaining Drizzle repository access and DTO serialization.
- [ ] Re-run API/entity tests, `npm run lint`, and `npx tsc --noEmit`.
- [ ] Commit as `feat: cache catalog reads in redis`.

### Task 5: Queue contracts and favorite-mutation enqueueing

**Files:**
- Create: `src/server/queue/names.ts`
- Create: `src/server/queue/client.ts`
- Create: `src/server/queue/jobs.ts`
- Create: `src/server/queue/jobs.test.ts`
- Modify: `src/app/(api)/api/favorites/route.ts`
- Modify: `src/app/(api)/api/favorites/[itemId]/route.ts`
- Modify: relevant route tests

**Produces:** Typed `enqueueFavoriteRecount({ itemId })` with 3 attempts and exponential backoff; favorite POST/DELETE enqueue only after DB success and log queue unavailability without rolling back the user mutation.

- [ ] Write failing tests for the job name, payload, retry options, and enqueue after each successful mutation.
- [ ] Run them and confirm the current routes have no enqueue behavior.
- [ ] Implement the BullMQ queue singleton, job options, and mutation integration.
- [ ] Re-run focused tests and all tests.
- [ ] Commit as `feat: enqueue favorite recount jobs`.

### Task 6: Separate idempotent worker and Trending rebuild

**Files:**
- Create: `src/worker/index.ts`
- Create: `src/worker/processors.ts`
- Create: `src/worker/processors.test.ts`
- Modify: `src/entities/favorite/api/server.ts`

**Produces:** `favorites:recount`, `trending:rebuild`, and `cache:warm` processors; repeatable rebuild registration using a fixed job id; SIGTERM cleanup; structured duration logs.

- [ ] Write failing processor tests showing recount always derives the score from the database and safely invalidates the affected item/top cache.
- [ ] Run them and confirm failure because the worker has no processors.
- [ ] Add aggregate/repository methods in the favorite service, worker processors, ZSET writes, warm-up, repeatable job registration, and graceful shutdown.
- [ ] Re-run worker tests, all tests, lint, and TypeScript.
- [ ] Commit as `feat: add redis trending worker`.

### Task 7: Trending API, hydration and catalog UI

**Files:**
- Create: `src/entities/trending/api/server.ts`
- Create: `src/entities/trending/api/client.ts`
- Create: `src/entities/trending/model/query-keys.ts`
- Create: `src/widgets/trending/ui/trending-list.tsx`
- Create: `src/app/(api)/api/trending/route.ts`
- Modify: `src/app/(web)/items/page.tsx`
- Modify: `src/views/catalog/ui/catalog-page.tsx`
- Test: `src/entities/trending/api/server.test.ts`
- Test: `src/app/(api)/api/trending/route.test.ts`

**Produces:** `GET /api/trending` returns top-N existing item DTOs from the ZSET/top cache and the existing catalog page renders a hydrated “Trending now” section.

- [ ] Write failing server and route tests for score ordering, absent/deleted IDs, top cache hit, and Redis fallback.
- [ ] Run them and confirm failure because the endpoint does not exist.
- [ ] Implement the server/client query modules, route, server prefetch and small presentation widget following the existing item-card patterns.
- [ ] Re-run focused tests, full tests, lint and TypeScript.
- [ ] Commit as `feat: show trending catalog items`.

### Task 8: Cache observability, documentation and acceptance verification

**Files:**
- Create: `src/app/(api)/api/cache/stats/route.ts`
- Create: `src/app/(api)/api/cache/stats/route.test.ts`
- Modify: `README.md`
- Modify: existing E2E verification script or create `scripts/verify-cache-worker-flow.ts`

**Produces:** Development cache-statistics endpoint, documented operational commands and cache policy, and repeatable smoke coverage for Redis unavailable and favorites-to-Trending.

- [ ] Write failing tests for the stats JSON contract and safe unavailable-Redis response.
- [ ] Run them and confirm failure because the endpoint does not exist.
- [ ] Add the route, README instructions for Docker/worker/single-flight/fallback, and a deterministic manual or scripted acceptance flow.
- [ ] Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and the acceptance script with Redis running; then stop Redis and verify item endpoints still return database data.
- [ ] Commit as `docs: document redis cache and worker operations`.

## Final Acceptance Checklist

- [ ] Repeated item list/detail requests report a cache hit.
- [ ] A single item/favorite mutation invalidates only affected keys.
- [ ] Redis unavailability logs an error but does not return 500 for catalog routes.
- [ ] `npm run worker` is independent from `npm run dev` and registers a unique recurring rebuild.
- [ ] A favorite toggle eventually changes its item score and Trending display.
- [ ] No environment secret is committed; Docker and environment instructions are current.
