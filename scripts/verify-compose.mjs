import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function configuredPath(variable, fallback) {
  return process.env[variable] ? pathToFileURL(resolve(process.env[variable])) : fallback;
}

const composePath = configuredPath("COMPOSE_PATH", new URL("../docker-compose.yml", import.meta.url));
const localDbComposePath = configuredPath("LOCAL_DB_COMPOSE_PATH", new URL("../docker-compose.local-db.yml", import.meta.url));

function fail(message) {
  console.error(`Compose verification failed: ${message}`);
  process.exit(1);
}

function requireMatch(value, pattern, description) {
  if (!pattern.test(value)) {
    fail(description);
  }
}

function serviceContents(compose, service) {
  const match = compose.match(new RegExp(`^  ${service}:\\s*\\n([\\s\\S]*?)(?=^  [\\w-]+:\\s*$|^(?:volumes|networks):|(?![\\s\\S]))`, "m"));
  if (!match) {
    fail(`the ${service} service is missing.`);
  }

  return match[1];
}

async function readRequiredFile(path, label) {
  try {
    return await readFile(path, "utf8");
  } catch {
    fail(`${label} is missing.`);
  }
}

const [compose, localDbCompose] = await Promise.all([
  readRequiredFile(composePath, "docker-compose.yml"),
  readRequiredFile(localDbComposePath, "docker-compose.local-db.yml"),
]);

for (const service of ["redis", "migrate", "web", "worker", "postgres", "seed"]) {
  requireMatch(compose, new RegExp(`^  ${service}:\\s*$`, "m"), `the ${service} service is missing.`);
}

requireMatch(compose, /redis-server\s+--appendonly\s+yes[\s\S]*?--maxmemory-policy\s+noeviction/, "Redis must use append-only persistence and noeviction.");
requireMatch(compose, /redis:[\s\S]*?healthcheck:[\s\S]*?redis-cli[\s\S]*?ping/, "Redis must have a redis-cli ping healthcheck.");
requireMatch(compose, /^networks:\s*\n  app-network:\s*\{\}\s*$/m, "the app network must allow egress while private services remain unpublished.");

const hostPorts = [...compose.matchAll(/^\s+-\s+"?(\d+):\d+"?\s*$/gm)];
if (hostPorts.length !== 1 || hostPorts[0][1] !== "3000") {
  fail("only web may publish host port 3000.");
}

for (const service of ["web", "worker"]) {
  requireMatch(compose, new RegExp(`  ${service}:\\s*[\\s\\S]*?depends_on:[\\s\\S]*?migrate:\\s*\\n\\s+condition:\\s+service_completed_successfully`), `${service} must wait for successful migrations.`);
  requireMatch(compose, new RegExp(`  ${service}:\\s*[\\s\\S]*?init:\\s+true`), `${service} must enable init.`);
  requireMatch(compose, new RegExp(`  ${service}:\\s*[\\s\\S]*?restart:\\s+unless-stopped`), `${service} must restart unless stopped.`);
  requireMatch(compose, new RegExp(`  ${service}:\\s*[\\s\\S]*?stop_grace_period:\\s+\\d+s`), `${service} must set a bounded stop grace period.`);
}

requireMatch(compose, /migrate:[\s\S]*?depends_on:[\s\S]*?redis:\s*\n\s+condition:\s+service_healthy/, "migrate must wait for Redis health.");
requireMatch(compose, /migrate:[\s\S]*?postgres:\s*\n\s+condition:\s+service_healthy[\s\S]*?required:\s+false/, "migrate must wait for local Postgres health when it is enabled.");
requireMatch(compose, /migrate:[\s\S]*?DIRECT_URL:\s+\$\{DIRECT_URL:-postgresql:\/\/filmscatalog:local-development-password@postgres:5432\/filmscatalog\}/, "migrate must receive a direct database URL.");
requireMatch(compose, /web:[\s\S]*?healthcheck:[\s\S]*?\/api\/health/, "web must healthcheck /api/health.");
requireMatch(compose, /worker:[\s\S]*?healthcheck:[\s\S]*?redis\.ping\(\)/, "worker must have a Redis liveness healthcheck.");
requireMatch(compose, /postgres:[\s\S]*?profiles:\s*\n\s+-\s+local-db/, "postgres must be opt-in through the local-db profile.");
requireMatch(compose, /seed:[\s\S]*?profiles:\s*\n\s+-\s+demo/, "seed must be opt-in through the demo profile.");
requireMatch(compose, /seed:[\s\S]*?depends_on:[\s\S]*?migrate:\s*\n\s+condition:\s+service_completed_successfully/, "seed must wait for successful migrations.");
requireMatch(compose, /web:[\s\S]*?build:[\s\S]*?args:[\s\S]*?NEXT_PUBLIC_APP_URL:/, "web must pass NEXT_PUBLIC_APP_URL as a build argument.");
requireMatch(compose, /seed:[\s\S]*?target:\s+seed/, "seed must use the dedicated seed image target.");

const localPostgresUrl = "postgresql://filmscatalog:local-development-password@postgres:5432/filmscatalog";
for (const [service, variables] of [
  ["migrate", ["DIRECT_URL"]],
  ["web", ["DATABASE_URL", "DIRECT_URL"]],
  ["worker", ["DATABASE_URL", "DIRECT_URL"]],
  ["seed", ["DATABASE_URL"]],
]) {
  for (const variable of variables) {
    requireMatch(
      serviceContents(localDbCompose, service),
      new RegExp(`^      ${variable}:\\s+${localPostgresUrl.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}$`, "m"),
      `the local-db override must force ${service}.${variable} to the private Postgres URL.`,
    );
  }
}

console.info("Compose verification passed.");
