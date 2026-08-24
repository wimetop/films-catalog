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
