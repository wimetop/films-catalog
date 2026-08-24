import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const composePath = new URL("../docker-compose.yml", import.meta.url);
const localDbComposePath = new URL("../docker-compose.local-db.yml", import.meta.url);
const verifierPath = new URL("./verify-compose.mjs", import.meta.url);

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function runMutation({ mutateCompose = (value) => value, mutateLocalDbCompose = (value) => value }) {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "filmscatalog-compose-"));
  const fixtureCompose = join(fixtureDirectory, "docker-compose.yml");
  const fixtureLocalDbCompose = join(fixtureDirectory, "docker-compose.local-db.yml");

  try {
    await cp(composePath, fixtureCompose);
    await writeFile(fixtureLocalDbCompose, await readOptional(localDbComposePath));
    await writeFile(fixtureCompose, mutateCompose(await readFile(fixtureCompose, "utf8")));
    await writeFile(fixtureLocalDbCompose, mutateLocalDbCompose(await readFile(fixtureLocalDbCompose, "utf8")));

    return spawnSync(process.execPath, [fileURLToPath(verifierPath)], {
      encoding: "utf8",
      env: {
        ...process.env,
        COMPOSE_PATH: fixtureCompose,
        LOCAL_DB_COMPOSE_PATH: fixtureLocalDbCompose,
      },
    });
  } finally {
    await rm(fixtureDirectory, { force: true, recursive: true });
  }
}

test("keeps private services unpublished while allowing external database egress", async () => {
  const compose = await readOptional(composePath);

  expect(compose).not.toMatch(/^networks:\s*\n  app-network:\s*\n    internal:\s*true$/m);
  expect(compose.match(/^\s+-\s+"?\d+:\d+"?\s*$/gm)).toEqual(["      - \"3000:3000\""]);
});

test("local-db override forces every database consumer to the private Postgres service", async () => {
  const localDbCompose = await readOptional(localDbComposePath);
  const postgresUrl = "postgresql://filmscatalog:local-development-password@postgres:5432/filmscatalog";

  for (const service of ["migrate", "web", "worker", "seed"]) {
    expect(localDbCompose).toMatch(new RegExp(`^  ${service}:\\s*[\\s\\S]*?postgres:5432\\/filmscatalog`, "m"));
  }
  expect(localDbCompose.match(new RegExp(postgresUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(6);
});

test("rejects an internal-only application network", async () => {
  const result = await runMutation({
    mutateCompose: (compose) => compose.replace("  app-network: {}\n", "  app-network:\n    internal: true\n"),
  });

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/app network must allow egress/);
});

test("rejects local-db URLs that can inherit external environment values", async () => {
  const result = await runMutation({
    mutateLocalDbCompose: (compose) => compose.replace("postgresql://filmscatalog:local-development-password@postgres:5432/filmscatalog", "${DATABASE_URL}"),
  });

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/local-db override must force/);
});
