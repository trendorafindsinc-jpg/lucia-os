import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Required only when applying migrations. Schema generation does not
    // connect to production or need a production credential.
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/lucia_os_dev",
  },
  strict: true,
  verbose: true,
});
