import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const root = new URL("../", import.meta.url);
const dockerfilePath = new URL("../Dockerfile", import.meta.url);
const dockerignorePath = new URL("../.dockerignore", import.meta.url);
const verifierPath = new URL("./verify-docker-layout.mjs", import.meta.url);

async function runMutation({ mutateDockerfile = (value) => value, mutateDockerignore = (value) => value }) {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "filmscatalog-docker-layout-"));
  const fixtureDockerfile = join(fixtureDirectory, "Dockerfile");
  const fixtureDockerignore = join(fixtureDirectory, ".dockerignore");

  try {
    await cp(dockerfilePath, fixtureDockerfile);
    await cp(dockerignorePath, fixtureDockerignore);
    await writeFile(fixtureDockerfile, mutateDockerfile(await readFile(fixtureDockerfile, "utf8")));
    await writeFile(fixtureDockerignore, mutateDockerignore(await readFile(fixtureDockerignore, "utf8")));

    return spawnSync(process.execPath, [fileURLToPath(verifierPath)], {
      cwd: fileURLToPath(root),
      encoding: "utf8",
      env: {
        ...process.env,
        DOCKERFILE_PATH: fixtureDockerfile,
        DOCKERIGNORE_PATH: fixtureDockerignore,
      },
    });
  } finally {
    await rm(fixtureDirectory, { force: true, recursive: true });
  }
}

function expectMutationFailure(mutation, expectedError) {
  return async () => {
    const result = await runMutation(mutation);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(expectedError);
  };
}

test("requires cached dependency manifests before npm ci", expectMutationFailure({
  mutateDockerfile: (dockerfile) => dockerfile.replace("COPY package.json package-lock.json ./", "COPY package.json ./"),
}, /deps must copy package\.json and package-lock\.json before npm ci/));

test("requires worker production dependencies to omit dev dependencies", expectMutationFailure({
  mutateDockerfile: (dockerfile) => dockerfile.replace("RUN npm prune --omit=dev", "RUN npm prune"),
}, /production-deps must prune development dependencies/));

for (const [source, expectedError] of [
  ["COPY --from=build --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts", /migrate must copy the Drizzle config/],
  ["COPY --from=build --chown=node:node /app/src/db/schema ./src/db/schema", /migrate must copy the Drizzle schema/],
  ["COPY --from=deps --chown=node:node /app/node_modules ./node_modules", /migrate must copy Drizzle Kit/],
]) {
  test(`requires migration input ${source}`, expectMutationFailure({
    mutateDockerfile: (dockerfile) => dockerfile.replace(source, `# ${source}`),
  }, expectedError));
}

for (const [source, expectedError] of [
  ["COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json", /seed must copy tsconfig for path aliases/],
  ["COPY --from=build --chown=node:node /app/scripts/seed.ts ./scripts/seed.ts", /seed must copy only the seed program/],
  ["COPY --from=build --chown=node:node /app/src/db/client.ts ./src/db/client.ts", /seed must copy its database client/],
]) {
  test(`requires seed input ${source}`, expectMutationFailure({
    mutateDockerfile: (dockerfile) => dockerfile.replace(source, `# ${source}`),
  }, expectedError));
}

test("rejects additional web COPY sources", expectMutationFailure({
  mutateDockerfile: (dockerfile) => dockerfile.replace(
    "COPY --from=build --chown=node:node /app/public ./public",
    "COPY --from=build --chown=node:node /app/public ./public\nCOPY --from=build --chown=node:node /app/README.md ./README.md",
  ),
}, /web may copy only standalone, static, and public assets/));

test("rejects package metadata copied outside standalone", expectMutationFailure({
  mutateDockerfile: (dockerfile) => dockerfile.replace(
    "COPY --from=build --chown=node:node /app/public ./public",
    "COPY --from=build --chown=node:node /app/public ./public\nCOPY --from=build --chown=node:node /app/package.json ./package.json",
  ),
}, /web may copy only standalone, static, and public assets/));

for (const [pattern, expectedError] of [
  [".git", /\.dockerignore must exclude \.git/],
  ["node_modules", /\.dockerignore must exclude node_modules/],
  [".next", /\.dockerignore must exclude \.next/],
  ["coverage", /\.dockerignore must exclude coverage/],
  ["reports", /\.dockerignore must exclude reports/],
  ["dist", /\.dockerignore must exclude dist/],
  ["build", /\.dockerignore must exclude build/],
  ["out", /\.dockerignore must exclude out/],
  ["test-results", /\.dockerignore must exclude test-results/],
  ["playwright-report", /\.dockerignore must exclude playwright-report/],
  ["**/*.test.*", /\.dockerignore must exclude test files/],
]) {
  test(`requires .dockerignore to exclude ${pattern}`, expectMutationFailure({
    mutateDockerignore: (dockerignore) => dockerignore.replace(`\n${pattern}\n`, `\n# ${pattern}\n`),
  }, expectedError));
}
