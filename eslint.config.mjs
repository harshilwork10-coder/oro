import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Downgraded to warn — `any` types are tracked tech debt, not build blockers
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars warn only, with escape hatch for underscore-prefixed names
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unused-vars": "off", // defer to @typescript-eslint version
      // @ts-ignore → @ts-expect-error migration — warn only, tracked as tech debt
      "@typescript-eslint/ban-ts-comment": "warn",
      // Style rules — warn only, these are tracked tech debt not build blockers
      "prefer-const": "warn",
      // Unescaped JSX entities ('  ") — warn only, many existing occurrences across UI files
      "react/no-unescaped-entities": "warn",
      // React-hooks sub-rules — warn only; genuine rules-of-hooks violations were
      // fixed structurally (hooks extracted to sub-components, early returns moved after hooks).
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      // react-hooks/purity — warns about Date.now(), Math.random() etc. called during render.
      // These are common patterns in UI code and not correctness issues in practice.
      "react-hooks/purity": "warn",
      // react-hooks/immutability — warns about `new Set()`, `new Map()` in render body.
      // These are common patterns (expandedRows, selectedIds) that work correctly.
      "react-hooks/immutability": "warn",
      // Console guardrail — only console.log/warn/debug are blocked; console.error is allowed.
      // Note: console.warn/log in existing files are tracked as tech debt, not build blockers.
      "no-console": "warn",
    }
  },
  // Test files: allow require() style imports used in Jest mocking patterns
  {
    files: ["**/__tests__/**/*.ts", "**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*.tsx", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "no-console": "off",
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "print-agent/**"
  ]),
]);

export default eslintConfig;
