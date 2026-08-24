# Worker and Queue Isolation Design

## Goal

Make the standalone BullMQ worker independent from Next.js-only modules and prevent favorite recount backlog from competing with catalog/outbox work.

## Architecture

- `src/entities/item/api/data-service.ts` contains worker-safe catalog reads. It does not import `server-only`, Next APIs or queues.
- `src/entities/item/api/server.ts` remains the Next server boundary and delegates catalog reads to the data service.
- Queue topology is split into `catalog` and `favorites`. Catalog handles Trending, cache warm and outbox publisher. Favorites handles only `favorites:recount` with an independent worker and limiter.
- The outbox publisher batches claimed events by `itemId` before enqueueing recount jobs. One batch therefore creates at most one job per item.

## Reliability

Each worker has an explicit graceful shutdown sequence: close worker, close its queue client, then quit Redis. Recount retention remains bounded. API contracts are unchanged.

## Verification

- Unit tests prove worker imports use the worker-safe service.
- Unit tests prove repeated outbox events for one item result in one enqueue per publisher batch.
- TypeScript, ESLint, Vitest and Next production build pass.
