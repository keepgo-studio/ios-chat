import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  { 
    files: ["src/**/*.{js,mjs,cjs,ts}"], 
    plugins: { 
      js,
      "unused-imports": unusedImports,
    },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Enable eslint-plugin-unused-imports
      "unused-imports/no-unused-imports": "error",
    },
  },
  {
    files: ["src/**/*.ts"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // Disable @typescript-eslint/no-empty-object-type
      "@typescript-eslint/no-empty-object-type": "off",
    },
  }
]);