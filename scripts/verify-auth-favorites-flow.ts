import { randomUUID } from "node:crypto";

import { config } from "dotenv";
import { eq } from "drizzle-orm";

import { createDatabase } from "@/db/client";
import { user } from "@/db/schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (!databaseUrl) throw new Error("DATABASE_URL is not defined");

const { db, dbClient } = createDatabase(databaseUrl);
const email = `qa-${randomUUID()}@example.test`;
const password = "catalog-qa-password";
const itemId = "0c7fc962-fc6f-4af2-a529-a5550a000001";

function getSessionCookie(response: Response): string {
  const setCookies = response.headers.getSetCookie();
  const sessionCookie = setCookies.find((cookie) => cookie.includes("session_token="));

  if (!sessionCookie) throw new Error("Better Auth did not return a session cookie");

  return sessionCookie.split(";", 1)[0];
}

async function request(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("origin", baseUrl);

  const response = await fetch(`${baseUrl}${url}`, { ...init, headers });

  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} failed: ${await response.text()}`);

  return response;
}

async function verifyFlow() {
  let sessionCookie = "";

  try {
    const signUpResponse = await request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "QA User", email, password }),
    });
    sessionCookie = getSessionCookie(signUpResponse);

    await request("/api/auth/sign-out", {
      method: "POST",
      headers: { cookie: sessionCookie, "content-type": "application/json" },
      body: "{}",
    });

    const signInResponse = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    sessionCookie = getSessionCookie(signInResponse);

    await request("/api/favorites", {
      method: "POST",
      headers: { cookie: sessionCookie, "content-type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    const favoritesResponse = await request("/api/favorites", { headers: { cookie: sessionCookie } });
    const favorites = await favoritesResponse.json() as Array<{ id: string }>;

    if (!favorites.some((item) => item.id === itemId)) throw new Error("Favorite was not persisted");

    await request(`/api/favorites/${itemId}`, { method: "DELETE", headers: { cookie: sessionCookie } });
    console.log("Auth and favorites end-to-end flow passed.");
  } finally {
    await db.delete(user).where(eq(user.email, email));
    await dbClient.end({ timeout: 5 });
  }
}

verifyFlow().catch((error) => {
  console.error("Auth and favorites end-to-end flow failed.", error);
  process.exitCode = 1;
});
