# Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure, reproducible Docker Compose deployment for the Next.js web service, compiled BullMQ worker, Redis, and Drizzle migrations.

**Architecture:** A pinned Node Alpine multi-stage Dockerfile shares dependency installation and builds both Next standalone output and an esbuild worker artifact. Compose gates web and worker on healthy dependencies and completed migrations, keeps all non-web services private, and has opt-in local Postgres and seed profiles.

**Tech Stack:** Node 22 Alpine, Docker BuildKit, Docker Compose, Next.js 16 standalone output, esbuild, Drizzle Kit, BullMQ, ioredis, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-docker-deployment-design.md`

## Global Constraints

- Base image: `node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32`.
- Runtime secrets are environment variables only; never copy `.env*` into an image.
- `NEXT_PUBLIC_APP_URL` is a build argument; all other supplied application variables are runtime values.
- Web, worker, and migrate execute as non-root; only web exposes a host port.
- Health is database readiness: Redis failure returns HTTP 200 degraded, while database failure returns HTTP 503.
- Production worker starts with `node dist/worker/index.js`, never `tsx`.

---

### Task 1: Make the health contract testable

**Files:**
- Create: `src/app/(api)/api/health/route.test.ts`
- Create: `src/app/(api)/api/health/route.ts`

**Interfaces:**
- Consumes: `dbClient` from `@/db`; `redis` from `@/server/cache/client`.
- Produces: `GET(): Promise<Response>`.

- [ ] **Step 1: Write failing health contract tests**

```ts
it("returns ok when database and Redis respond", async () => {
  dbClient.execute = vi.fn().mockResolvedValue([]);
  redis.ping = vi.fn().mockResolvedValue("PONG");
  expect((await GET()).status).toBe(200);
});

it("returns degraded 200 when only Redis is down", async () => {
  dbClient.execute = vi.fn().mockResolvedValue([]);
  redis.ping = vi.fn().mockRejectedValue(new Error("down"));
  expect(await (await GET()).json()).toMatchObject({ status: "degraded", database: "ok", redis: "down" });
});

it("returns 503 when database is down", async () => {
  dbClient.execute = vi.fn().mockRejectedValue(new Error("down"));
  expect((await GET()).status).toBe(503);
});
```

- [ ] **Step 2: Run `npm test -- src/app/(api)/api/health/route.test.ts` and confirm failure.**
- [ ] **Step 3: Implement dynamic `GET` using `Promise.allSettled` with `dbClient.execute("select 1")` and `redis.ping()`. Return no raw errors or secrets.**
- [ ] **Step 4: Re-run the route test and `npm run lint`.**
- [ ] **Step 5: Commit `feat: add deployment health endpoint`.**

### Task 2: Add standalone and a production worker build

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`
- Create: `scripts/build-worker.mjs`

**Interfaces:**
- Produces: `.next/standalone/server.js`; `dist/worker/index.js`.

- [ ] **Step 1: Add a failing artifact assertion to `scripts/verify-worker-build.mjs` that checks `dist/worker/index.js` exists and does not reference `tsx`.**
- [ ] **Step 2: Run it before implementing and confirm failure.**
- [ ] **Step 3: Set `output: "standalone"`; add `esbuild` dev dependency and `build:worker`/`verify:worker-build` scripts. Bundle `src/worker/index.ts` for Node 22 with aliases resolved and `react-server` conditions using `platform: "node"`, `format: "cjs"`, and `external: ["bullmq", "ioredis"]`.**
- [ ] **Step 4: Run `npm run build:worker`, `node dist/worker/index.js` with intentionally invalid env (expect clear env failure), and `npm run verify:worker-build`.**
- [ ] **Step 5: Commit `build: add production worker artifact`.**

### Task 3: Create secure multi-stage Docker targets

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces Docker targets named `web`, `worker`, and `migrate`.

- [ ] **Step 1: Write `scripts/verify-docker-layout.mjs` checks for pinned `FROM`, `USER node` in all targets, standalone copy paths, `PORT=3000`, `HOSTNAME=0.0.0.0`, and absence of `.env` copies.**
- [ ] **Step 2: Run it and confirm failure.**
- [ ] **Step 3: Implement cached `deps`, build, and the three final targets. Copy migration SQL using `--chown=node:node` in migrate; copy only standalone/static/public to web; expose 3000 only as Docker metadata. Add ignore rules for secrets, Git, dependencies, output, tests, reports, and coverage.**
- [ ] **Step 4: Run `node scripts/verify-docker-layout.mjs` and `docker build --target web -t filmscatalog-web:test .`.**
- [ ] **Step 5: Commit `build: add non-root Docker images`.**

### Task 4: Replace Compose with gated private services

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: targets and commands from Tasks 2–3.
- Produces services `redis`, `migrate`, `web`, `worker`, optional `postgres`, and optional `seed`.

- [ ] **Step 1: Add a Compose validation script asserting service names, web-only host port, `init: true`, dependency conditions, Redis `noeviction`, web health path, worker healthcheck, and profiles.**
- [ ] **Step 2: Run `docker compose config` and the validation before modifications; confirm missing requirements.**
- [ ] **Step 3: Implement the Compose services, private network, Redis volume/healthcheck, direct URLs for migration, local-db Postgres healthcheck/profile, demo seed profile, and Docker npm lifecycle scripts.**
- [ ] **Step 4: Run `docker compose config`, `npm run docker:build`, then `docker compose --profile local-db --profile demo up --build -d`; inspect health and migration completion.**
- [ ] **Step 5: Commit `feat: orchestrate Docker deployment`.**

### Task 5: Document and verify operational behavior

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Documents the exact `docker:build`, `docker:up`, `docker:down`, and `docker:logs` scripts, external database setup, and profile commands.

- [ ] **Step 1: Add README Docker workflow: create `.env`, standard external DB execution, fully local `--profile local-db`, demo seeding, migrations, health endpoint semantics, logs, and clean shutdown.**
- [ ] **Step 2: Document only placeholder credentials in `.env.example`, including `NEXT_PUBLIC_APP_URL`.**
- [ ] **Step 3: Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run build:worker`, `docker compose config`, and the Compose smoke flow.**
- [ ] **Step 4: Kill Redis during the smoke flow; confirm `/api/health` is 200 degraded and catalog still responds. Stop Compose and verify worker shutdown log.**
- [ ] **Step 5: Commit `docs: document Docker workflow`.**
