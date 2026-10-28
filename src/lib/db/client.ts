import "server-only";

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as typeof globalThis & {
  luciaOsSql?: ReturnType<typeof postgres>;
  luciaOsDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function createDatabase() {
  // Production must use the dedicated NOBYPASSRLS runtime role. Local and
  // preview environments may continue to use DATABASE_URL until separately provisioned.
  const connectionString =
    process.env.VERCEL_ENV === "production"
      ? process.env.DATABASE_URL_RUNTIME
      : process.env.DATABASE_URL_RUNTIME ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      process.env.VERCEL_ENV === "production"
        ? "DATABASE_URL_RUNTIME is required in production."
        : "DATABASE_URL_RUNTIME or DATABASE_URL is required for database access.",
    );
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

export function getDb() {
  return globalForDb.luciaOsDb ?? createDatabase();
}
