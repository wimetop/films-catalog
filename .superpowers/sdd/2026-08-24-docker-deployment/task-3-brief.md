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
