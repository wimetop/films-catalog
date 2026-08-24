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
