# Films Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Supabase-backed films catalog with email/password authentication and per-user favorites.

**Architecture:** Next.js App Router owns routing and server rendering. FSD middle+ separates page composition, widgets, user actions, and domain modules; Drizzle access is server-only, while TanStack Query owns client cache and favorite mutations.

**Tech Stack:** Next.js 16, TypeScript, React 19, TanStack Query, react-hook-form, Better Auth, Drizzle ORM/Kit, postgres.js, Supabase Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-films-catalog-design.md`

## Global Constraints

- Use the App Router and Server Components for initial list and detail rendering.
- Use only Drizzle for `items` and `favorites`; do not use raw SQL or supabase-js for them.
- Put secrets only in `.env.local`; commit only `.env.example`.
- Use `DATABASE_URL` at runtime and `DIRECT_URL` in Drizzle Kit.
- Place `proxy.ts` in `src/`, alongside `src/app/`.
- Keep FSD dependency direction: `app → pages → widgets → features → entities → shared`.
- Treat `proxy.ts` as UX protection; repeat authorization inside protected pages and API handlers.

## Planned File Structure

```text
src/
  app/(web)/{page.tsx,items/[id]/page.tsx,login/page.tsx,register/page.tsx,favorites/page.tsx}
  app/(api)/api/{auth/[...all]/route.ts,items/route.ts,items/[id]/route.ts,favorites/route.ts,favorites/[itemId]/route.ts}
  app/{layout.tsx,providers.tsx,globals.css}
  pages/{catalog-page,item-details-page,favorites-page,login-page,register-page}/
  widgets/{app-header,items-catalog,favorites-list}/
  features/{auth-by-email,toggle-favorite}/
  entities/{item,favorite,session}/{api,model,ui}/
  shared/{api,config,lib,ui,types}/
  db/{schema,queries,commands}/
  proxy.ts
drizzle/{0000_initial.sql,meta/}
drizzle.config.ts
scripts/seed.ts
```

### Task 1: Bootstrap the project and create the FSD skeleton

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `.env.example`
- Create: all directories from the planned file structure, with `.gitkeep` only in otherwise-empty directories
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/providers.tsx`, `src/proxy.ts`

**Produces:** A running Next.js 16 TypeScript app with `@/*` mapped to `src/*`, an empty QueryClient provider, and no domain logic.

- [ ] **Step 1: Scaffold the project without a nested directory**

Run from repository root:

```powershell
npx create-next-app@latest . --ts --eslint --app --src-dir --use-npm --import-alias "@/*" --no-tailwind --yes
```

Expected: `src/app`, TypeScript, and ESLint configuration exist; `npm run dev` starts the app.

- [ ] **Step 2: Install the runtime and development dependencies**

```powershell
npm install @tanstack/react-query @tanstack/react-query-devtools react-hook-form better-auth @better-auth/drizzle-adapter drizzle-orm postgres
npm install -D drizzle-kit vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Replace the generated structure with the planned FSD directories**

Create every directory listed above. Do not put placeholder React components in FSD layers yet; use `.gitkeep` only when Git would otherwise omit a directory.

- [ ] **Step 4: Add safe environment documentation**

Create `.env.example`:

```dotenv
DATABASE_URL=
DIRECT_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

Verify `.gitignore` includes `.env*` and contains an exception for `!.env.example`.

- [ ] **Step 5: Verify the clean bootstrap**

Run:

```powershell
npm run lint
npx tsc --noEmit
```

Expected: both commands exit with code 0.

### Task 2: Add Drizzle configuration and generate authentication schema

**Files:**
- Create: `src/db/index.ts`, `src/db/schema/auth.ts`, `src/db/schema/index.ts`
- Create: `src/shared/api/auth.ts`, `src/shared/api/auth-client.ts`, `src/app/(api)/api/auth/[...all]/route.ts`
- Create: `src/shared/config/env.ts`

**Interfaces:**
- Produces `db`, `schema`, Better Auth tables, `auth`, and `authClient`.

- [ ] **Step 1: Define a server-only database client and initial auth configuration**

`src/db/index.ts` must construct `postgres(process.env.DATABASE_URL!)` and initially export `drizzle(client)`. Configure `betterAuth` with `drizzleAdapter(db, { provider: "pg" })`, `emailAndPassword: { enabled: true }`, the environment secret, and base URL. The adapter schema is intentionally omitted at this moment because this task generates it next.

- [ ] **Step 2: Generate Better Auth Drizzle schema**

Run:

```powershell
npx auth@latest generate
```

Move or generate the resulting `user`, `session`, `account`, and `verification` Drizzle definitions in `src/db/schema/auth.ts`. All primary keys must be compatible with the text user id used by Better Auth.


- [ ] **Step 3: Complete the adapter configuration**

Export all generated tables from `src/db/schema/index.ts`, rebuild `db` as `drizzle(client, { schema })`, and pass `schema` into `drizzleAdapter(db, { provider: "pg", schema })`. Add the Next.js handler via `toNextJsHandler(auth)` and create `authClient` with `createAuthClient()`.

### Task 3: Add application tables, migration, seed, and session boundaries

**Files:**
- Create: `src/db/schema/item.ts`, `src/db/schema/favorite.ts`, `drizzle.config.ts`, `scripts/seed.ts`
- Create: `src/entities/session/api/get-session.ts`, `src/proxy.ts`
- Create: `drizzle/0000_initial.sql` via Drizzle Kit

**Interfaces:**
- Produces application tables, seed data, and `getCurrentSession(): Promise<Session | null>`.

- [ ] **Step 1: Define application tables and apply the migration**

Use `pgTable`, `uuid(...).defaultRandom().primaryKey()`, `text`, `timestamp(...).defaultNow()`, `foreignKey`, and `uniqueIndex` to create `items` and `favorites`. `favorites.userId` references `user.id`; `favorites.itemId` references `items.id`; add `favorites_user_item_unique`. Export both in `db/schema/index.ts`.

`drizzle.config.ts` uses `process.env.DIRECT_URL`, `schema: "./src/db/schema/index.ts"`, `out: "./drizzle"`, and dialect `postgresql`. Run `npx drizzle-kit generate` then `npx drizzle-kit push`.

- [ ] **Step 2: Implement and run the repeatable seed**

Add at least ten film objects with title, description, and nullable image URL. Add `"db:seed": "tsx scripts/seed.ts"`, install `tsx` as a dev dependency, and run `npm run db:seed` twice. The second run must not duplicate films.

- [ ] **Step 3: Add server session helper**

Create the Better Auth client with `createAuthClient()`. The server helper calls `auth.api.getSession({ headers: await headers() })` and returns its `session`/`user` pair or `null`.

- [ ] **Step 4: Protect navigation and rendering**

`src/proxy.ts` matches `/favorites/:path*`; when the Better Auth session cookie is absent redirect to `/login?next=/favorites`. `/favorites/page.tsx` calls `getCurrentSession()` and calls `redirect("/login?next=/favorites")` if it returns null.

- [ ] **Step 5: Manual verification**

Register a user, reload the browser, request `/api/auth/get-session`, and confirm a session remains. Open `/favorites` in a logged-out browser context and confirm redirect to login.

### Task 4: Implement the item entity and public read API

**Files:**
- Create: `src/entities/item/model/types.ts`, `src/entities/item/model/query-keys.ts`
- Create: `src/entities/item/api/server.ts`, `src/entities/item/api/client.ts`
- Create: `src/app/(api)/api/items/route.ts`, `src/app/(api)/api/items/[id]/route.ts`

**Interfaces:**
- Produces `getItems(): Promise<Item[]>`, `getItemById(id: string): Promise<Item | null>`, `itemKeys.all`, and `itemKeys.detail(id)`.

- [ ] **Step 1: Write `Item` type and exact cache keys**

```ts
export type Item = { id: string; title: string; description: string | null; imageUrl: string | null; createdAt: Date }
export const itemKeys = { all: ["items"] as const, detail: (id: string) => ["items", id] as const }
```

- [ ] **Step 2: Implement Drizzle-only read functions**

Use `db.select().from(items).orderBy(desc(items.createdAt))` for the list and `eq(items.id, id)` for one item. Map database column names to the public `Item` type in this layer.

- [ ] **Step 3: Implement GET route handlers**

Return `Response.json(await getItems())`; for an unknown ID return `Response.json({ message: "Item not found" }, { status: 404 })`.

- [ ] **Step 4: Verify endpoints**

With the development server running, visit `/api/items` and a valid `/api/items/<uuid>`. Confirm unknown UUID returns 404.

### Task 5: Build public catalog and details pages with hydration-safe queries

**Files:**
- Create: `src/entities/item/ui/item-card.tsx`, `src/entities/item/ui/item-details.tsx`
- Create: `src/widgets/items-catalog/ui/items-catalog.tsx`
- Create: `src/pages/catalog-page/ui/catalog-page.tsx`, `src/pages/item-details-page/ui/item-details-page.tsx`
- Modify: `src/app/(web)/page.tsx`, `src/app/(web)/items/[id]/page.tsx`

**Interfaces:**
- Consumes `getItems`, `getItemById`, `Item`, and `itemKeys`.
- Produces public server-rendered list and details pages.

- [ ] **Step 1: Write server page composition**

In route pages call server query functions, pass their result to page components, and call `notFound()` for a missing item.

- [ ] **Step 2: Implement client query wrappers**

Use `useQuery({ queryKey: itemKeys.all, queryFn: fetchItems, initialData: initialItems })` and the analogous detail key. Query functions fetch only internal `/api` endpoints and throw on non-OK responses.

- [ ] **Step 3: Render accessible cards and details**

Each card uses `next/link` to `/items/${item.id}`, displays title and description fallback, and images only when `imageUrl` exists.

- [ ] **Step 4: Verify**

Reload `/` and `/items/<uuid>` with JavaScript disabled in browser DevTools: first-render content must still be visible. Re-enable JS and verify React Query Devtools show populated cache.

### Task 6: Implement login and registration feature

**Files:**
- Create: `src/features/auth-by-email/model/schema.ts`, `src/features/auth-by-email/ui/auth-form.tsx`
- Create: `src/pages/login-page/ui/login-page.tsx`, `src/pages/register-page/ui/register-page.tsx`
- Modify: `src/app/(web)/login/page.tsx`, `src/app/(web)/register/page.tsx`

**Interfaces:**
- Produces `AuthForm({ mode: "login" | "register" }): JSX.Element`.

- [ ] **Step 1: Define form values and validation**

```ts
export type AuthFormValues = { email: string; password: string; name?: string }
export const passwordMinLength = 8
```

Use `register("email", { required: "Email is required", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" } })` and password `minLength` of 8.

- [ ] **Step 2: Implement the form using `useForm<AuthFormValues>()`**

For login call `authClient.signIn.email({ email, password })`; for registration call `authClient.signUp.email({ name, email, password })`. Display field errors and an API error alert. After success call `router.replace(next ?? "/")` and `router.refresh()`.

- [ ] **Step 3: Verify invalid and valid flows**

Submit empty values, invalid email, and seven-character password; each must show validation errors without a request. Then register and log out/login with the same account.

### Task 7: Implement favorite persistence and protected API

**Files:**
- Create: `src/entities/favorite/model/types.ts`, `src/entities/favorite/model/query-keys.ts`
- Create: `src/entities/favorite/api/server.ts`, `src/entities/favorite/api/client.ts`
- Create: `src/app/(api)/api/favorites/route.ts`, `src/app/(api)/api/favorites/[itemId]/route.ts`

**Interfaces:**
- Produces `getFavoritesByUserId(userId)`, `addFavorite(userId, itemId)`, `removeFavorite(userId, itemId)`, and `favoriteKeys.all`.

- [ ] **Step 1: Implement server commands with Drizzle**

`addFavorite` inserts `{ userId, itemId }` with `.onConflictDoNothing()` on the unique target. `removeFavorite` deletes with `and(eq(favorites.userId, userId), eq(favorites.itemId, itemId))`. The read query joins favorites to items or selects only item ids, depending on the UI need.

- [ ] **Step 2: Secure every handler**

Each route calls `getCurrentSession()`. Return `401` with `{ message: "Unauthorized" }` before reading or writing if no user exists. Validate that POST JSON has a non-empty string `itemId`; otherwise return 400.

- [ ] **Step 3: Implement GET, POST, and DELETE responses**

GET returns the current user's favorites; POST returns the final favorite state with 200; DELETE returns `204`.

- [ ] **Step 4: Verify isolation**

Create two accounts in separate browser profiles. Add a film for the first. The second user's `/api/favorites` response must not contain it.

### Task 8: Add optimistic favorite UI and favorites page

**Files:**
- Create: `src/features/toggle-favorite/model/use-toggle-favorite.ts`, `src/features/toggle-favorite/ui/favorite-button.tsx`
- Create: `src/widgets/favorites-list/ui/favorites-list.tsx`
- Create: `src/pages/favorites-page/ui/favorites-page.tsx`
- Modify: item card/details UI and `src/app/(web)/favorites/page.tsx`

**Interfaces:**
- Consumes `favoriteKeys.all`, `itemKeys`, favorite API client, `Item`.
- Produces `<FavoriteButton itemId={string} isFavorite={boolean} />`.

- [ ] **Step 1: Implement a mutation with rollback**

In `onMutate`, cancel `favoriteKeys.all`, snapshot the cache, and set the optimistic list. In `onError`, restore the snapshot. In `onSettled`, invalidate `favoriteKeys.all`, `itemKeys.all`, and the active item detail key.

- [ ] **Step 2: Render favorite controls only for active sessions**

The header gets session state from a server component and renders `/favorites` link only when authenticated. Item UI receives `isAuthenticated` and omits the button otherwise; direct unauthenticated mutation errors redirect to `/login`.

- [ ] **Step 3: Implement server-first favorites page**

The route page checks session, reads favorites via server function, and passes `initialData` into the client list query.

- [ ] **Step 4: Verify no-full-reload behavior**

In DevTools Network, click add/remove and confirm only the favorite API request occurs; list state changes immediately and remains correct after a manual refresh.

### Task 9: Complete UI states, documentation, and quality checks

**Files:**
- Create: `src/widgets/app-header/ui/app-header.tsx`, `README.md`
- Modify: entity and widget UI files, `package.json`

**Interfaces:**
- Produces loading, empty, and error states for each query-driven UI surface.

- [ ] **Step 1: Add explicit UI states**

Catalog/favorites lists display `Loading films…`, `No films found.`, and a retry button after a query error. Details display a 404 page for missing ids. Mutation buttons disable while pending and expose an error message on failure.

- [ ] **Step 2: Document setup and commands**

README must list prerequisite Node version, `.env.local` creation from `.env.example`, migration command, seed command, development command, and a two-user manual verification checklist.

- [ ] **Step 3: Final verification**

Run:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0. Then perform the manual acceptance flow from the spec.
