# Resilience Follow-up Design

## Goal

Close the N1-N6 follow-up findings and the explicitly listed remaining operational gaps without changing public API contracts.

## Worker and outbox

The `favorites` BullMQ worker runs with `concurrency: 1`. A recount is a read-modify-write projection into Redis ZSET, therefore serial execution is the correctness boundary for a single deployed worker process. The outbox publisher continues grouping up to 100 events into one job, but polls every two seconds to reduce idle Supabase traffic. A startup cache-warm job is added once queues are ready. README documents that a failed recount can leave the projection stale until the scheduled rebuild repairs it.

## Cache behavior

Catalog version reads must consult the process-local Redis circuit breaker before issuing a Redis command. If open, catalog reads immediately use the existing DB semaphore. Trending cache uses the same envelope validation as the other cache entries. Catalog mutations use the existing version-key invalidation rather than a per-item CAS because there is no item-update API; cache readers always include the version in their key.

## Database metadata

The Drizzle schema declares the existing partial indexes for pending and terminal outbox cleanup paths. The generated snapshot records the same indexes so `db:generate` cannot emit destructive index drops. This corrects metadata only; the existing 0004, 0005, and 0007 migrations already create production indexes and will not be replayed.

## UX and protection

After a favorite mutation, the client invalidates trending immediately and performs a short bounded refetch window to cross the outbox/worker delay. Public API routes receive the same distributed Redis limiter policy where request identity can be determined safely. The documented proxy requirement remains unchanged. `.env.example` contains a non-secret `REDIS_URL` placeholder and the runtime validator names the missing variable; no real credential is written to `.env.local`.

## Verification

Unit tests cover serial favorites worker configuration, circuit-open catalog reads, trending envelope rejection, outbox index declarations, retry-window behavior, and startup warm registration. A local integration script verifies Redis/BullMQ flow when `REDIS_URL`, `DATABASE_URL`, and `DIRECT_URL` are supplied. Full test, lint, TypeScript, and production build checks are required.
