import "server-only";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as typeof globalThis & {
  luciaOsSql?: ReturnType<typeof postgres>;
  luciaOsDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database access.");
  }

  const sql = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  globalForDb.luciaOsSql = sql;
  globalForDb.luciaOsDb = drizzle(sql, { schema });
  return globalForDb.luciaOsDb;
}

export const db = globalForDb.luciaOsDb ?? createDatabase();
