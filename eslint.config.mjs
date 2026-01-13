import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // === PRODUCTION GUARDRAIL: Block console.log/warn/debug ===
  // Only console.error allowed. Use structured logging for audit trails.
  // This prevents debug log spam from creeping back into the codebase.
  {
    rules: {
      "no-console": ["error", { allow: ["error"] }]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Print agent is Node.js, not Next.js
    "print-agent/**"
  ]),
]);

export default eslintConfig;
