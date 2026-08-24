import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const artifactPath = new URL("../dist/worker/index.js", import.meta.url);

try {
  await access(artifactPath, constants.F_OK);
} catch {
  console.error("Worker build verification failed: dist/worker/index.js is missing.");
  process.exit(1);
}

const artifact = await readFile(artifactPath, "utf8");

const forbiddenArtifacts = [
  ["tsx", "references tsx"],
  ["@/", "contains an unresolved @/ alias"],
  ["server-only", "contains a server-only marker"],
  ["This module cannot be imported from a Client Component module.", "contains the server-only client guard"],
];

for (const [fragment, description] of forbiddenArtifacts) {
  if (artifact.includes(fragment)) {
    console.error(`Worker build verification failed: dist/worker/index.js ${description}.`);
    process.exit(1);
  }
}

if (/^\s*(?:import|export)\s/m.test(artifact)) {
  console.error("Worker build verification failed: dist/worker/index.js contains ESM module syntax instead of CommonJS.");
  process.exit(1);
}

for (const dependency of ["bullmq", "ioredis"]) {
  const cjsRequire = new RegExp(`require\\(["']${dependency}["']\\)`);
  if (!cjsRequire.test(artifact)) {
    console.error(`Worker build verification failed: dist/worker/index.js does not keep ${dependency} as a CommonJS external.`);
    process.exit(1);
  }
}

console.info("Worker build verification passed.");
