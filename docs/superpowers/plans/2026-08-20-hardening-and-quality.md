# Hardening and Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security, repository, error-handling, caching, and test-coverage gaps found in the Films Catalog review.

**Architecture:** Keep Better Auth and Drizzle server-only. Restrict Supabase Data API roles with RLS while allowing the server-side database role to continue operating. Centralize safe internal redirect validation and favorites error mapping; cache only public catalog reads.

**Tech Stack:** Next.js 16, TypeScript, Better Auth, Drizzle ORM, Supabase Postgres, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-films-catalog-design.md`

## Global Constraints

- Keep all item and favorite persistence through Drizzle; do not add supabase-js.
- Keep secrets in `.env.local`; commit only `.env.example`.
- Keep `/favorites` protected by `proxy.ts` and server session validation.
- Keep favorites cache partitioned by `userId`.

---

### Task 1: Repository and redirect safety

**Files:**
- Modify: `.gitignore`
- Modify: `src/shared/lib/get-safe-callback-url.ts`
- Modify: `src/shared/lib/get-safe-callback-url.test.ts`

- [x] Write a failing test proving `/\\evil.test` resolves to the fallback route.
- [x] Run `npm test -- src/shared/lib/get-safe-callback-url.test.ts` and confirm RED.
- [x] Reject protocol-relative and backslash URL forms.
- [x] Add `!.env.example` after the `.env*` rule.
- [x] Re-run the focused test and verify `.env.example` is trackable.

### Task 2: Database and API hardening

**Files:**
- Create: `drizzle/0001_enable_rls_and_catalog_indexes.sql`
- Modify: `src/entities/favorite/api/server.ts`
- Modify: `src/app/(api)/api/favorites/route.ts`
- Create: `src/entities/favorite/model/favorite-errors.ts`
- Test: `src/entities/favorite/model/favorite-errors.test.ts`

- [x] Write failing tests mapping Postgres foreign-key error `23503` to a not-found domain error.
- [x] Add a server helper that checks item existence before creating a favorite.
- [x] Return 404 for a valid UUID that does not identify an item.
- [x] Add SQL that enables RLS and revokes Data API access for `anon` and `authenticated`; add `items(created_at)` index.
- [x] Apply the schema, enable RLS, and verify it against Supabase.

### Task 3: Public catalog caching and boundaries

**Files:**
- Modify: `src/entities/item/api/server.ts`
- Modify: `src/config/env/env.server.ts`
- Modify: `src/config/env/env.client.ts`
- Test: `src/entities/item/model/serialize-item.test.ts`

- [x] Preserve existing serialization test green.
- [x] Cache only `getItems` with Next Data Cache and a finite revalidation window.
- [x] Mark the server env module server-only at the top; keep client env import-safe.
- [x] Run lint, typecheck, unit tests, and production build.

### Task 4: Regression coverage and documentation

**Files:**
- Modify: `src/proxy.test.ts`
- Modify: `README.md`

- [x] Add a local smoke e2e command that creates and removes an isolated QA account while verifying register/login/favorites.
- [x] Document RLS/Data API design, cache policy, and migration commands.
- [x] Run final `npm test`, lint, typecheck, build, and RLS verification.
