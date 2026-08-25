import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function configuredPath(variable, fallback) {
  return process.env[variable] ? pathToFileURL(resolve(process.env[variable])) : fallback;
}

const dockerfilePath = configuredPath("DOCKERFILE_PATH", new URL("../Dockerfile", import.meta.url));
const dockerignorePath = configuredPath("DOCKERIGNORE_PATH", new URL("../.dockerignore", import.meta.url));
const nodeImage = "node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32";

function fail(message) {
  console.error(`Docker layout verification failed: ${message}`);
  process.exit(1);
}

async function readRequiredFile(path, label) {
  try {
    return await readFile(path, "utf8");
  } catch {
    fail(`${label} is missing.`);
  }
}

function stageContents(dockerfile, stage) {
  const match = dockerfile.match(new RegExp(`FROM\\s+[^\\n]+\\s+AS\\s+${stage}\\s*\\n([\\s\\S]*?)(?=\\nFROM\\s|$)`, "i"));
  if (!match) {
    fail(`the ${stage} target is missing.`);
  }

  return match[1];
}

function requireMatch(value, pattern, description) {
  if (!pattern.test(value)) {
    fail(description);
  }
}

const [dockerfile, dockerignore] = await Promise.all([
  readRequiredFile(dockerfilePath, "Dockerfile"),
  readRequiredFile(dockerignorePath, ".dockerignore"),
]);

const fromLines = dockerfile.match(/^FROM\s+.+$/gim) ?? [];
if (fromLines.length === 0) {
  fail("Dockerfile has no FROM instruction.");
}

for (const fromLine of fromLines) {
  const image = fromLine.replace(/^FROM\s+/i, "").split(/\s+(?:AS\s+)?/i)[0];
  if (image !== nodeImage && image !== "base" && image !== "deps" && image !== "migrate" && image !== "build") {
    fail(`unpinned or unexpected base image in: ${fromLine}`);
  }
}

requireMatch(dockerfile, new RegExp(`^FROM\\s+${nodeImage.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+AS\\s+base$`, "im"), "the base stage must use the pinned Node image.");

for (const target of ["web", "worker", "migrate"]) {
  requireMatch(stageContents(dockerfile, target), /^USER\s+node$/im, `the ${target} target must run as node.`);
}

const deps = stageContents(dockerfile, "deps");
const dependencyManifestCopy = /^COPY\s+package\.json\s+package-lock\.json\s+\.\/\s*$/im;
const dependencyInstall = /^RUN\s+npm\s+ci(?:\s|$)/im;
requireMatch(deps, dependencyManifestCopy, "deps must copy package.json and package-lock.json before npm ci.");
requireMatch(deps, dependencyInstall, "deps must install dependencies with npm ci.");
if (deps.search(dependencyManifestCopy) > deps.search(dependencyInstall)) {
  fail("deps must copy package.json and package-lock.json before npm ci.");
}

const web = stageContents(dockerfile, "web");
requireMatch(web, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/\.next\/standalone\s+\.\/\s*$/im, "web must copy the standalone output.");
requireMatch(web, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/\.next\/static\s+\.\/\.next\/static\s*$/im, "web must copy standalone static assets.");
requireMatch(web, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/public\s+\.\/public\s*$/im, "web must copy public assets.");
requireMatch(web, /^ENV\s+PORT=3000$/im, "web must set PORT=3000.");
requireMatch(web, /^ENV\s+HOSTNAME=0\.0\.0\.0$/im, "web must set HOSTNAME=0.0.0.0.");
requireMatch(web, /^EXPOSE\s+3000$/im, "web must expose port 3000 as image metadata.");
const allowedWebCopies = new Set([
  "COPY --from=build --chown=node:node /app/.next/standalone ./",
  "COPY --from=build --chown=node:node /app/.next/static ./.next/static",
  "COPY --from=build --chown=node:node /app/public ./public",
]);
for (const copyInstruction of web.match(/^COPY\s+.+$/gim) ?? []) {
  if (!allowedWebCopies.has(copyInstruction.trim())) {
    fail("web may copy only standalone, static, and public assets.");
  }
}

const workerDeps = stageContents(dockerfile, "worker-deps");
requireMatch(workerDeps, /npm install --omit=dev --no-save bullmq@6\.2\.0 ioredis@6\.0\.0/, "worker dependencies must be installed from the minimal runtime set.");
const worker = stageContents(dockerfile, "worker");
requireMatch(worker, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/dist\/worker\s+\.\/dist\/worker\s*$/im, "worker must copy the production CJS artifact.");
requireMatch(worker, /^CMD\s+\["node",\s*"dist\/worker\/index\.js"\]$/im, "worker must start its CJS artifact with Node.");
requireMatch(worker, /^COPY\s+--from=worker-deps\s+--chown=node:node\s+\/runtime\/node_modules\s+\.\/node_modules\s*$/im, "worker must copy only its minimal runtime dependencies.");

const migrate = stageContents(dockerfile, "migrate");
requireMatch(migrate, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/drizzle\s+\.\/drizzle\s*$/im, "migrate must copy checked-in SQL migrations with node ownership.");
requireMatch(migrate, /^COPY\s+--from=build\s+--chown=node:node\s+\/app\/drizzle\.config\.ts\s+\.\/drizzle\.config\.ts\s*$/im, "migrate must copy the Drizzle config.");
requireMatch(migrate, /^COPY\s+--from=build\s+--chown=node:node\s+\/app\/src\/db\/schema\s+\.\/src\/db\/schema\s*$/im, "migrate must copy the Drizzle schema.");
requireMatch(migrate, /^COPY\s+--from=deps\s+--chown=node:node\s+\/app\/node_modules\s+\.\/node_modules\s*$/im, "migrate must copy Drizzle Kit from deps.");

const seed = stageContents(dockerfile, "seed");
requireMatch(seed, /^USER\s+node$/im, "the seed target must run as node.");
requireMatch(seed, /^COPY\s+--from=build\s+--chown=node:node\s+\/app\/tsconfig\.json\s+\.\/tsconfig\.json\s*$/im, "seed must copy tsconfig for path aliases.");
requireMatch(seed, /^COPY\s+--from=build\s+--chown=node:node\s+\/app\/scripts\/seed\.ts\s+\.\/scripts\/seed\.ts\s*$/im, "seed must copy only the seed program.");
requireMatch(seed, /^COPY\s+--from=build\s+--chown=node:node\s+\/app\/src\/db\/client\.ts\s+\.\/src\/db\/client\.ts\s*$/im, "seed must copy its database client.");
requireMatch(seed, /^CMD\s+\["\.\/node_modules\/\.bin\/tsx",\s*"scripts\/seed\.ts"\]$/im, "seed must start its seed program with tsx.");

if (/^COPY\s+.*\.env/mi.test(dockerfile) || /^ADD\s+.*\.env/mi.test(dockerfile)) {
  fail("Dockerfile must not copy .env files.");
}

const ignoredPaths = new Set(
  dockerignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#")),
);
for (const [pattern, description] of [
  [".env*", ".env files"],
  [".git", ".git"],
  ["node_modules", "node_modules"],
  [".next", ".next"],
  ["dist", "dist"],
  ["build", "build"],
  ["out", "out"],
  ["coverage", "coverage"],
  ["reports", "reports"],
  ["test-results", "test-results"],
  ["playwright-report", "playwright-report"],
  ["**/*.test.*", "test files"],
  ["**/__tests__/", "test directories"],
]) {
  if (!ignoredPaths.has(pattern)) {
    fail(`.dockerignore must exclude ${description}.`);
  }
}

const exposeOutsideWeb = dockerfile
  .split(/^FROM\s+/im)
  .filter((stage) => !/\sAS\sweb\s*(?:\r?\n|$)/i.test(stage))
  .some((stage) => /^EXPOSE\s+/im.test(stage));
if (exposeOutsideWeb) {
  fail("only the web target may expose a port.");
}

console.info("Docker layout verification passed.");
