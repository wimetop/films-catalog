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

if (artifact.includes("tsx")) {
  console.error("Worker build verification failed: dist/worker/index.js references tsx.");
  process.exit(1);
}

console.info("Worker build verification passed.");
