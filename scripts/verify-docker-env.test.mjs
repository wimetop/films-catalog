import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const verifierPath = new URL("./verify-docker-env.mjs", import.meta.url);

async function verifyEnvironment(contents, postgresPassword) {
  const directory = await mkdtemp(join(tmpdir(), "filmscatalog-docker-env-"));
  const envPath = join(directory, ".env");

  try {
    await writeFile(envPath, contents);
    return spawnSync(process.execPath, [fileURLToPath(verifierPath)], {
      encoding: "utf8",
      env: {
        ...process.env,
        DOCKER_ENV_PATH: envPath,
        ...(postgresPassword === undefined ? {} : { POSTGRES_PASSWORD: postgresPassword }),
      },
    });
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

test("accepts an unreserved local Postgres password", async () => {
  const result = await verifyEnvironment("POSTGRES_PASSWORD=local-db_password.123~ok\n");

  expect(result.status).toBe(0);
});

test("rejects a Postgres password that is unsafe inside the local database URL", async () => {
  const result = await verifyEnvironment("POSTGRES_PASSWORD=contains:colon\n");

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/unreserved URL-safe characters/);
});

test("rejects an unsafe shell password even when .env contains a safe value", async () => {
  const result = await verifyEnvironment("POSTGRES_PASSWORD=safe-file-password\n", "shell:override");

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/unreserved URL-safe characters/);
});

test("uses a safe shell password instead of an unsafe .env value", async () => {
  const result = await verifyEnvironment("POSTGRES_PASSWORD=unsafe:file-password\n", "safe-shell-password");

  expect(result.status).toBe(0);
});
