import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Separate from vite.config.ts on purpose: that file's base/PWA-plugin setup
// exists to serve the real app and isn't relevant to (and would only add
// noise/risk to) running tests.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // Without this, package "exports" resolution can pick Svelte's
    // server-rendering build instead of the client build under Vitest,
    // which breaks component mounting.
    conditions: ['browser'],
    alias: {
      // vite-plugin-pwa provides this as a virtual module at build time;
      // there's no real plugin (or service worker to register) under test.
      'virtual:pwa-register': fileURLToPath(
        new URL('./src/test/mocks/virtual-pwa-register.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,svelte}'],
    },
  },
});
