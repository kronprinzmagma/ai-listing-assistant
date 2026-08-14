import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build-Artefakte der Sub-Packages: von tsup generiert (das CJS-Bundle
    // nutzt require()) und per .gitignore ausgeschlossen — nicht zu linten.
    "packages/*/dist/**",
  ]),
]);

export default eslintConfig;
