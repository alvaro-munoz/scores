// @ts-check
import svelteConfig from './svelte.config.js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  globalIgnores(['dist', 'dev-dist', 'public', 'coverage']),

  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  // Turn off stylistic rules that would fight Prettier's formatting.
  prettier,
  svelte.configs.prettier,

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Node-context files (config/build scripts, not shipped to the browser).
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript inside `<script lang="ts">` needs the TS parser wired in.
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },

  {
    rules: {
      // Prefixing an intentionally-unused arg/var with `_` opts out of the
      // "unused" warning (common e.g. for #each index params we don't use).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
