import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const databaseUrl = process.env.DIRECT_URL;

if (!databaseUrl) throw new Error("DIRECT_URL is not defined");

const sql = postgres(databaseUrl, { prepare: false });

async function applySecurity() {
  await sql.unsafe('ALTER TABLE "user" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('ALTER TABLE "session" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('ALTER TABLE "account" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('ALTER TABLE "items" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY');
  await sql.unsafe('REVOKE ALL ON TABLE "user", "session", "account", "verification", "items", "favorites", "outbox_events" FROM anon, authenticated');
}

applySecurity()
  .then(() => console.log("Supabase Data API access revoked and RLS enabled."))
  .finally(async () => sql.end({ timeout: 5 }));
