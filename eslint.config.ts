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
      "no-nested-ternary": "warn",
      "complexity": ["warn", 15],
      "unicorn/prefer-modern-math-apis": "warn",
      "unicorn/no-zero-fractions": "warn",
      "unicorn/no-negated-condition": "warn",
      "unicorn/prefer-number-properties": "warn",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error"
    }
  },
  tseslint.configs.recommended,
]);
