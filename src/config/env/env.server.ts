import "server-only";

type RequiredServerEnv = "DATABASE_URL" | "DIRECT_URL" | "BETTER_AUTH_SECRET";

function getRequiredServerEnv(name: RequiredServerEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

export const envServer = {
  databaseUrl: getRequiredServerEnv("DATABASE_URL"),
  directUrl: getRequiredServerEnv("DIRECT_URL"),
  betterAuthSecret: getRequiredServerEnv("BETTER_AUTH_SECRET"),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
} as const;
