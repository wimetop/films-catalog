# Films catalog — technical design

## Goal

Build a films catalog with public list and details pages plus a private, per-user favorites list. The stack is Next.js 16 App Router, TypeScript, Drizzle ORM, Supabase Postgres, Better Auth, TanStack Query, and react-hook-form.

## Architecture

The project follows FSD middle+ with the supplied client-side file naming convention: slices expose a public `index.ts`, components use the `.component.tsx` suffix, and optional sub-elements live in an `elements` segment.

```text
src/
  app/          # routes, layouts, providers, and route handlers only
  pages/        # page-level composition
  widgets/      # reusable page sections
  features/     # user actions: authentication and favorite toggle
  entities/     # item, favorite, and session domain modules
  shared/       # generic UI, types, configuration, and utilities
  db/           # Drizzle client, schemas, and seed script
```

Dependencies point downward only: `app → pages → widgets → features → entities → shared`. Database access is isolated to `db` and server-side API/query modules; UI does not import Drizzle directly.

## Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Films list | Public |
| `/items/[id]` | Film details | Public |
| `/favorites` | Current user's favorites | Authenticated only |
| `/login` | Sign-in form | Public |
| `/register` | Sign-up form | Public |
| `/api/auth/[...all]` | Better Auth handler | Internal |
| `/api/items`, `/api/items/[id]` | Client query data | Public |
| `/api/favorites` | Favorites read/create | Authenticated only |
| `/api/favorites/[itemId]` | Favorite removal | Authenticated only |

Route groups are `(web)` and `(api)`: they organize Next.js routes without changing URLs. `proxy.ts` redirects unauthenticated `/favorites` navigation to `/login`. The protected page repeats the server-side session check and redirects if needed.

## Data model

Better Auth owns `user`, `session`, `account`, and `verification`. Drizzle schema files are split into `auth.ts`, `item.ts`, and `favorite.ts`, then exported from `db/schema/index.ts`.

`items`:

- `id`: UUID primary key
- `title`: required text
- `description`: nullable text
- `image_url`: nullable text
- `created_at`: timestamp with `now()` default

`favorites`:

- `id`: UUID primary key
- `user_id`: required foreign key to `user.id`
- `item_id`: required foreign key to `items.id`
- `created_at`: timestamp with `now()` default
- unique index on `(user_id, item_id)`

The app uses `DATABASE_URL` via the transaction pooler at runtime. Drizzle Kit uses `DIRECT_URL` for migrations. The seed script inserts at least ten films and is safe to run repeatedly.

## Data flow and cache

Server Components render the initial item list, item details, and favorites through server-side Drizzle query functions. Client components use TanStack Query with this response as `initialData`.

Route handlers are thin adapters over the same server query/command functions. They never duplicate database logic. Favorite mutation handlers verify the Better Auth session before writing.

Query keys are centralized:

```ts
items: { all: ["items"], detail: (id) => ["items", id] }
favorites: { all: ["favorites"] }
```

The favorite-toggle feature uses an optimistic mutation, restores the previous cache on error, and invalidates `items` and `favorites` keys after settlement.

## Forms and error handling

Login and registration forms use react-hook-form and validate email format plus password minimum length before calling Better Auth. Authentication errors are displayed near the form.

Missing items return `notFound()` on pages and `404` from API routes. Unauthenticated favorites API requests return `401`. Duplicate favorite requests do not create duplicates because the database uniqueness constraint is authoritative.

## Environment and verification

Secrets remain only in `.env.local`, which is ignored by Git. `.env.example` documents variable names without values, including `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.

Verification includes linting, TypeScript checking, migrations and seed, plus a manual two-user smoke test covering session persistence and favorites isolation.
