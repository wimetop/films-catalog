# Docker Runtime Hardening Design

## Goal

Repair the Docker deployment so a Redis restart cannot silently stop queue
processing, all health checks represent the component they claim to measure,
and the documented Node 20+ / production-image guarantees are true.

## Runtime liveness

The worker owns a Redis heartbeat key with a short TTL. It refreshes the key on
a fixed interval and immediately after each completed job. The Compose
healthcheck reads that exact key and rejects missing or stale values. Worker
and shared Redis client errors that cannot be recovered terminate the worker;
Compose then applies `restart: unless-stopped`. Bootstrap registers schedules,
waits for workers, warms the cache, and enqueues one Trending rebuild.

## Trending and health contracts

Trending treats an empty ZSET like an unavailable projection and loads the
canonical ranking from Postgres. The ZSET has no expiry because it is a
persistent projection. `/api/health` concurrently checks Postgres and Redis
with short bounded timeouts and returns 200 only when both respond; every
other state returns 503 with sanitized component statuses.

## Container and Compose contracts

The web image remains Next standalone. The worker image contains only its
compiled CommonJS artifact plus runtime `bullmq` and `ioredis` dependencies
installed in a clean temporary package, avoiding transitive tooling pulled by
`better-auth`. Redis and Postgres are restartable services; migrations depend
only on Postgres when that opt-in service exists. `docker:up` uses Compose
`--wait`, and Compose checks worker heartbeat instead of a probe-owned Redis
client. Web retains Next's built-in SIGTERM draining with a 30-second Compose
grace period.

## Verification

Add unit tests for empty-ranking fallback, strict health states and secret
validation; update static Docker/Compose verifiers and run them on Node 22.
Run unit, type, lint, build and Compose config verification, then smoke-test a
Redis restart: queued jobs resume and heartbeat/Trending recover without a
worker restart.
