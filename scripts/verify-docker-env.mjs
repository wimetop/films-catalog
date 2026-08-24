import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const environmentPath = resolve(process.env.DOCKER_ENV_PATH ?? ".env");
const unreservedUrlCharacters = /^[A-Za-z0-9._~-]+$/;

function fail(message) {
  console.error(`Docker environment verification failed: ${message}`);
  process.exit(1);
}

function readEnvironmentValue(source, name) {
  const line = source.split(/\r?\n/).find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) fail(`${name} must be set in .env.`);

  const value = line.slice(name.length + 1).trim();
  if (!value) fail(`${name} must not be empty.`);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

let environmentSource;
try {
  environmentSource = await readFile(environmentPath, "utf8");
} catch {
  fail(".env is required; copy .env.example and replace its placeholders.");
}

const postgresPassword = readEnvironmentValue(environmentSource, "POSTGRES_PASSWORD");
if (!unreservedUrlCharacters.test(postgresPassword)) {
  fail("POSTGRES_PASSWORD must use only unreserved URL-safe characters: A-Z, a-z, 0-9, '.', '_', '~', or '-'.");
}

console.info("Docker environment verification passed.");
