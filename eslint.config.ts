import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["test/**"]
  },
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
          "varsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "no-unused-vars": "off",
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
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/default-param-last": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/require-array-sort-compare": ["error", { "ignoreStringArrays": false }],
      "no-dupe-else-if": "error",
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
      "unicorn/prefer-number-properties": "warn",
      "unicorn/prefer-class-fields": "error",
      "unicorn/no-useless-fallback-in-spread": "error",
      "unicorn/prefer-global-this": "error",
      "unicorn/no-array-method-this-argument": "error",
      "unicorn/prefer-array-find": "error",
      "unicorn/no-array-push-push": "warn",
      "unicorn/prefer-set-has": "warn"
    }
  },
  tseslint.configs.recommended,
]);
