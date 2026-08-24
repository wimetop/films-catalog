import { readFile } from "node:fs/promises";

const dockerfilePath = new URL("../Dockerfile", import.meta.url);
const dockerignorePath = new URL("../.dockerignore", import.meta.url);
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
  if (image !== nodeImage && image !== "base" && image !== "deps") {
    fail(`unpinned or unexpected base image in: ${fromLine}`);
  }
}

requireMatch(dockerfile, new RegExp(`^FROM\\s+${nodeImage.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+AS\\s+base$`, "im"), "the base stage must use the pinned Node image.");

for (const target of ["web", "worker", "migrate"]) {
  requireMatch(stageContents(dockerfile, target), /^USER\s+node$/im, `the ${target} target must run as node.`);
}

const web = stageContents(dockerfile, "web");
requireMatch(web, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/\.next\/standalone\s+\.\/\s*$/im, "web must copy the standalone output.");
requireMatch(web, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/\.next\/static\s+\.\/\.next\/static\s*$/im, "web must copy standalone static assets.");
requireMatch(web, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/public\s+\.\/public\s*$/im, "web must copy public assets.");
requireMatch(web, /^ENV\s+PORT=3000$/im, "web must set PORT=3000.");
requireMatch(web, /^ENV\s+HOSTNAME=0\.0\.0\.0$/im, "web must set HOSTNAME=0.0.0.0.");
requireMatch(web, /^EXPOSE\s+3000$/im, "web must expose port 3000 as image metadata.");

const worker = stageContents(dockerfile, "worker");
requireMatch(worker, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/dist\/worker\s+\.\/dist\/worker\s*$/im, "worker must copy the production CJS artifact.");
requireMatch(worker, /^CMD\s+\["node",\s*"dist\/worker\/index\.js"\]$/im, "worker must start its CJS artifact with Node.");

const migrate = stageContents(dockerfile, "migrate");
requireMatch(migrate, /COPY\s+--from=build\s+--chown=node:node\s+\/app\/drizzle\s+\.\/drizzle\s*$/im, "migrate must copy checked-in SQL migrations with node ownership.");

if (/^COPY\s+.*\.env/mi.test(dockerfile) || /^ADD\s+.*\.env/mi.test(dockerfile)) {
  fail("Dockerfile must not copy .env files.");
}

requireMatch(dockerignore, /(^|\n)\.env\*(\r?\n|$)/, ".dockerignore must exclude .env files.");

const exposeOutsideWeb = dockerfile
  .split(/^FROM\s+/im)
  .filter((stage) => !/\sAS\sweb\s*(?:\r?\n|$)/i.test(stage))
  .some((stage) => /^EXPOSE\s+/im.test(stage));
if (exposeOutsideWeb) {
  fail("only the web target may expose a port.");
}

console.info("Docker layout verification passed.");
