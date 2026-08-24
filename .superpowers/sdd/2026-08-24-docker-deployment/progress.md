# SDD ledger — plan: docs/superpowers/plans/2026-08-24-docker-deployment.md

## Pre-flight scan

| Tasks / interface | Producer → consumer | Finding / ruling |
| --- | --- | --- |
| 1 ↔ 3/4 | Health `GET` → web Docker healthcheck | Compatible: HTTP 200 covers `ok` and Redis `degraded`; only DB outage is 503. |
| 2 ↔ 3 | `dist/worker/index.js` → worker Docker target | Compatible: Task 2 produces CJS Node artifact, Task 3 copies/runs it. |
| 3 ↔ 4 | Docker targets → Compose services | Compatible: names `web`, `worker`, `migrate` are specified consistently. |
| 4 ↔ 5 | Compose scripts → README commands | Compatible: Task 5 documents the exact scripts introduced in Task 4. |
| Task 1 internal | Tests → route | Compatible: every stated response state is tested before implementation. |
| Task 2 internal | artifact check → bundler | Ruling: use esbuild CJS for Node 22 with `external: ["bullmq", "ioredis"]`, `platform: "node"`, `format: "cjs"`; this is the approved plan clarification. |
| Task 3 internal | layout verifier → Dockerfile | Compatible: verifier asserts the listed hardening requirements. |
| Task 4 internal | Compose validator → Compose | Compatible: service/security contract is directly testable using rendered config. |
| Task 5 internal | docs → smoke flow | Compatible: operational tests validate earlier artifacts without adding behavior. |

Baseline: `npm test` passed: 25 files, 58 tests. `npm ci` completed after local cache authorization.

Task 1: complete — `c46793a feat: add deployment health endpoint`, `d2a89d2 test: close health endpoint coverage gaps`; initial review PASS with two P2 coverage findings, fix round 1 re-review approved. Evidence: focused 5/5; full suite 63/63; lint and typecheck passed.

Task 2: complete — `885a54a build: add production worker artifact`, `394bf73 test: verify worker bundle runtime contracts`; initial review PASS with one P2 verifier-coverage finding, fix round 1 re-review approved. Evidence: 63/63 tests, lint, typecheck, Next standalone build, and worker verifier passed.
