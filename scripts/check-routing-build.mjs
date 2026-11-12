import { readFileSync, existsSync } from "node:fs";

if (existsSync("middleware.ts") || !existsSync("src/middleware.ts")) {
  throw new Error("Host routing middleware must live beside src/app, in src/middleware.ts.");
}
const manifest=JSON.parse(readFileSync(".next/server/middleware-manifest.json","utf8"));
if (!manifest.middleware?.["/"]?.files?.length || !manifest.sortedMiddleware?.includes("/")) {
  throw new Error("Build omitted customer-host routing middleware. Refusing a platform-only deployment.");
}
console.log("Customer-host routing middleware is present in the production build.");
