// Stands in for the `virtual:pwa-register` module vite-plugin-pwa provides
// at build time (see vitest.config.ts's resolve.alias) — there's no real
// service worker to register under test, so this just no-ops.
export function registerSW() {
  return async () => {};
}
