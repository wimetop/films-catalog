import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDatabase(databaseUrl: string) {
  const dbClient = postgres(databaseUrl, { prepare: false });
  const db = drizzle(dbClient, { schema });

  return { db, dbClient };
}
