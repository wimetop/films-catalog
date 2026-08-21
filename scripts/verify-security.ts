import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const databaseUrl = process.env.DIRECT_URL;

if (!databaseUrl) throw new Error("DIRECT_URL is not defined");

const sql = postgres(databaseUrl, { prepare: false });
const protectedTables = ["user", "session", "account", "verification", "items", "favorites", "outbox_events"];

async function verifySecurity() {
  const rows = await sql<{ tableName: string; rowSecurityEnabled: boolean; dataApiAccess: boolean }[]>`
    SELECT
      relname AS "tableName",
      relrowsecurity AS "rowSecurityEnabled",
      has_table_privilege('anon', oid, 'SELECT')
        OR has_table_privilege('authenticated', oid, 'SELECT') AS "dataApiAccess"
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ${sql(protectedTables)}
    ORDER BY relname
  `;

  if (rows.length !== protectedTables.length || rows.some((row) => !row.rowSecurityEnabled || row.dataApiAccess)) {
    throw new Error("Protected tables must have RLS and no Data API SELECT access");
  }

  console.log(`RLS verified for ${rows.length} protected tables.`);
}

verifySecurity().finally(async () => sql.end({ timeout: 5 }));
