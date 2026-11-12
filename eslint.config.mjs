import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig([
  ...compat.extends("next/core-web-vitals.js", "next/typescript.js"),
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
