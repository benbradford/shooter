import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { 
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], 
    plugins: { js, unicorn }, 
    extends: ["js/recommended"], 
    languageOptions: { 
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/prefer-readonly": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/prefer-readonly-parameter-types": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-else-return": "error",
      "no-lonely-if": "error",
      "no-nested-ternary": "warn",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-duplicate-imports": "error",
      "no-constant-condition": "error",
      "no-unreachable": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "warn",
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "complexity": ["warn", 15],
      "max-params": ["error", 7],
      "max-depth": ["warn", 4],
      "unicorn/prefer-modern-math-apis": "warn",
      "unicorn/no-zero-fractions": "warn",
      "unicorn/no-negated-condition": "warn",
      "unicorn/prefer-number-properties": "warn"
    }
  },
  tseslint.configs.recommended,
]);
