import "server-only";

import { envServer } from "@/config/env";

import { createDatabase } from "./client";

export const { db, dbClient } = createDatabase(envServer.databaseUrl);
